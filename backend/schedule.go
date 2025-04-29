package main

import (
	"UWOpenRecRoster2-Backend/models"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"html"
	"io"
	"net/http"
	"strings"
	"time"
)

type GymMetaData struct {
	title   string
	id      int
	encrypt string
}

var (
	bakke = GymMetaData{
		title:   "Bakke Recreation and Wellbeing Center",
		id:      1112,
		encrypt: "https://uwmadison.emscloudservice.com/web/CustomBrowseEvents.aspx?data=meoZqrqZMvHKSLWaHS%2f4bjdroAMc1geNvtL12O1chw1fIP%2bOGy79Y1bkm2DPPKqmpSFHyPvFHX3LAJJHEfBPycyxctYlpcHD4rIwd%2byAtBNWXsKhJT9UDchzs%2bSc3Ze6JFHimlPlQrL2Jk7LFEkj3FoTWmA0BKzQQk0%2beDFO2IBZSiNnDXPGZQ%3d%3d",
	}
	nick = GymMetaData{
		title:   "Nicholas Recreation Center",
		id:      1109,
		encrypt: "https://uwmadison.emscloudservice.com/web/CustomBrowseEvents.aspx?data=RtFXo1hK2Mh0UPlwkh3Aua7auJ66NvvBNBlUULUwM7vu4XjCwc5WoatHUWdz5pRofwluz9ZmHCNbHsgQ9uEDZjArIem0ShC%2fuM4gJbohNWkNGhzqKkAwrHDWzuEbcQxjHc8CzLweyL05oQ7ToCjKkM5TC%2b639V3qHwqgx1EhbWU%3d",
	}
)

const RECWELL_SCHEDULES_URL string = "https://uwmadison.emscloudservice.com/web/AnonymousServersApi.aspx/CustomBrowseEvents"

func fetchSchedules(date time.Time) (models.ScheduleResp, error) {
	var schedule models.ScheduleResp

	for _, gym := range []string{"bakke", "nick"} {
		gymEvents, err := fetchSchedule(date, gym)
		if err != nil {
			return models.ScheduleResp{}, fmt.Errorf("error fetching the %s schedule", gym)
		}

		if gym == "bakke" {
			schedule.Bakke = gymEvents
		} else {
			schedule.Nick = gymEvents
		}
	}

	return schedule, nil
}

func fetchSchedule(date time.Time, gym string) (models.FacilityEvents, error) {
	dateString := date.Format("2006-01-02")
	scheduleJson, err := fetchScheduleFromRecwell(dateString, gym)
	if err != nil {
		return models.FacilityEvents{}, fmt.Errorf("error fetching schedule from Recwell API: %w", err)
	}

	rawEvents, err := parseScheduleJson(scheduleJson)
	if err != nil {
		return models.FacilityEvents{}, fmt.Errorf("error parsing schedule json: %w", err)
	}

	validDateEvents, err := mapAndFilterDatesSameDay(rawEvents, date)
	if err != nil {
		return models.FacilityEvents{}, fmt.Errorf("error handling dates: %w", err)
	}

	events := mapEscapeStrings(validDateEvents)

	facilityEvents := reduceEventsToFacilityEvents(events)

	return facilityEvents, nil
}

func fetchScheduleFromRecwell(date string, gym string) ([]byte, error) {
	var gymMeta GymMetaData

	switch gym {
	case "bakke":
		gymMeta = bakke
	case "nick":
		gymMeta = nick
	default:
		return []byte{}, errors.New("gym must be either \"bakke\" or \"nick\"")
	}

	body := models.RequestBody{
		Date: date,
		Data: models.RequestData{
			BuildingId:       gymMeta.id,
			Title:            gymMeta.title,
			Format:           0,
			DropEventsInPast: false,
			EncryptD:         gymMeta.encrypt,
		},
	}

	jsonBody, err := json.Marshal(body)
	if err != nil {
		return []byte{}, fmt.Errorf("failed to marshal request body: %w", err)
	}

	resp, err := http.Post(RECWELL_SCHEDULES_URL, "application/json", bytes.NewBuffer(jsonBody))
	if err != nil {
		return []byte{}, fmt.Errorf("failed to make HTTP request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return []byte{}, fmt.Errorf("unexpected status code %d", resp.StatusCode)
	}

	scheduleBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return []byte{}, fmt.Errorf("failed to read response body: %w", err)
	}

	return scheduleBytes, nil
}

func parseScheduleJson(scheduleJson []byte) (models.EventsRaw, error) {
	var resp models.ResponseBody
	err := json.Unmarshal(scheduleJson, &resp)
	if err != nil {
		return models.EventsRaw{}, fmt.Errorf("error parsing JSON: %w", err)
	}

	var events models.EventsRaw
	err = json.Unmarshal([]byte(resp.Data), &events)
	if err != nil {
		return models.EventsRaw{}, fmt.Errorf("error parsing JSON: %w", err)
	}

	return events, nil
}

func mapAndFilterDatesSameDay(events models.EventsRaw, date time.Time) ([]models.Event, error) {
	loc, err := time.LoadLocation("America/Chicago")
	if err != nil {
		return []models.Event{}, fmt.Errorf("error loading America/Chicago timezone data")
	}

	dateDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, loc)

	eventsFiltered := []models.Event{}
	for _, event := range events.Events {
		timeFormat := "2006-01-02T15:04:05"
		startTime, err := time.Parse(timeFormat, event.EventStart)
		if err != nil {
			continue
		}

		endTime, err := time.Parse(timeFormat, event.EventEnd)
		if err != nil {
			continue
		}

		// Convert UTC times to Chicago timezone
		startTimeChicago := startTime.In(loc)
		endTimeChicago := endTime.In(loc)

		eventDate := time.Date(startTimeChicago.Year(), startTimeChicago.Month(), startTimeChicago.Day(), 0, 0, 0, 0, loc)
		if !eventDate.Equal(dateDay) {
			continue
		}

		eventsFiltered = append(eventsFiltered, models.Event{
			Name:     event.EventName,
			Location: event.Location,
			Start:    startTimeChicago.Format(time.RFC3339),
			End:      endTimeChicago.Format(time.RFC3339),
		})
	}

	return eventsFiltered, nil
}

func mapEscapeStrings(events []models.Event) []models.Event {
	eventsEscaped := make([]models.Event, len(events))
	for i, event := range events {
		eventsEscaped[i] = models.Event{
			Name:     strings.TrimSpace(html.UnescapeString(event.Name)),
			Location: strings.TrimSpace(html.UnescapeString(event.Location)),
			Start:    event.Start,
			End:      event.End,
		}
	}

	return eventsEscaped
}

const (
	court     = "court"
	mtMendota = "mount mendota"
	pool      = "pool"
	iceRink   = "ice rink"
	esports   = "esports"
)

func reduceEventsToFacilityEvents(events []models.Event) models.FacilityEvents {
	schedule := models.FacilityEvents{}
	for _, event := range events {
		location := strings.ToLower(event.Location)

		if strings.Contains(location, court) {
			schedule.Courts = append(schedule.Courts, event)
		} else if strings.Contains(location, mtMendota) {
			schedule.MtMendota = append(schedule.MtMendota, event)
		} else if strings.Contains(location, pool) {
			schedule.Pool = append(schedule.Pool, event)
		} else if strings.Contains(location, iceRink) {
			schedule.IceRink = append(schedule.IceRink, event)
		} else if strings.Contains(location, esports) {
			schedule.Esports = append(schedule.Esports, event)
		}
	}

	return schedule
}
