package main

import (
	"UWOpenRecRoster2-Backend/models"
	"strings"
	"testing"
	"time"
)

func TestMapAndFilterDatesSameDay(t *testing.T) {
	tests := []struct {
		name     string
		events   models.EventsRaw
		date     time.Time
		expected []models.Event
		err      error
	}{
		{
			name: "empty input",
			events: models.EventsRaw{
				Events: []models.EventRaw{},
			},
			date:     time.Date(2025, 4, 11, 0, 0, 0, 0, time.UTC),
			expected: []models.Event{},
			err:      nil,
		},
		{
			name: "invalid start time",
			events: models.EventsRaw{
				Events: []models.EventRaw{
					{
						EventName:  "Test Event",
						Location:   "Test Location",
						EventStart: "invalid-date",
						EventEnd:   "2025-04-11T12:00:00",
					},
				},
			},
			date:     time.Date(2025, 4, 11, 0, 0, 0, 0, time.UTC),
			expected: []models.Event{},
			err:      nil,
		},
		{
			name: "invalid end time",
			events: models.EventsRaw{
				Events: []models.EventRaw{
					{
						EventName:  "Test Event",
						Location:   "Test Location",
						EventStart: "2025-04-11T11:00:00",
						EventEnd:   "invalid-date",
					},
				},
			},
			date:     time.Date(2025, 4, 11, 0, 0, 0, 0, time.UTC),
			expected: []models.Event{},
			err:      nil,
		},
		{
			name: "different date",
			events: models.EventsRaw{
				Events: []models.EventRaw{
					{
						EventName:  "Test Event",
						Location:   "Test Location",
						EventStart: "2025-04-12T11:00:00", // Different day
						EventEnd:   "2025-04-12T12:00:00",
					},
				},
			},
			date:     time.Date(2025, 4, 11, 0, 0, 0, 0, time.UTC),
			expected: []models.Event{},
			err:      nil,
		},
		{
			name: "mixed valid and invalid inputs",
			events: models.EventsRaw{
				Events: []models.EventRaw{
					{
						EventName:  "Valid Event",
						Location:   "Valid Location",
						EventStart: "2025-04-11T11:00:00",
						EventEnd:   "2025-04-11T12:00:00",
					},
					{
						EventName:  "Invalid Start",
						Location:   "Test Location",
						EventStart: "invalid-date",
						EventEnd:   "2025-04-11T12:00:00",
					},
					{
						EventName:  "Different Date",
						Location:   "Test Location",
						EventStart: "2025-04-12T11:00:00",
						EventEnd:   "2025-04-12T12:00:00",
					},
				},
			},
			date: time.Date(2025, 4, 11, 0, 0, 0, 0, time.UTC),
			expected: []models.Event{
				{
					Name:     "Valid Event",
					Location: "Valid Location",
					Start:    "2025-04-11T06:00:00-05:00",
					End:      "2025-04-11T07:00:00-05:00",
				},
			},
			err: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual, err := mapAndFilterDatesSameDay(tt.events, tt.date)
			if err != tt.err {
				t.Errorf("TestMapAndFilterDatesSameDay - %s: got error %v, want %v", tt.name, err, tt.err)
			}
			if len(actual) != len(tt.expected) {
				t.Errorf("TestMapAndFilterDatesSameDay - %s: got %d events, want %d events", tt.name, len(actual), len(tt.expected))
				return
			}
			for i, event := range tt.expected {
				if actual[i] != event {
					t.Errorf("TestMapAndFilterDatesSameDay - %s: event %d mismatch:\ngot:  %+v\nwant: %+v", tt.name, i, actual[i], event)
				}
			}
		})
	}
}

func TestMapEscapeStrings(t *testing.T) {
	tests := []struct {
		name     string
		events   []models.Event
		expected []models.Event
		err      error
	}{
		{
			name:     "empty input",
			events:   []models.Event{},
			expected: []models.Event{},
			err:      nil,
		},
		{
			name: "whitespace cases",
			events: []models.Event{
				{
					Name:     "  leading space",
					Location: "trailing space  ",
					Start:    "2025-04-11T11:00:00",
					End:      "2025-04-11T12:00:00",
				},
				{
					Name:     "  both sides  ",
					Location: "  extra  spaces  ",
					Start:    "2025-04-11T13:00:00",
					End:      "2025-04-11T14:00:00",
				},
			},
			expected: []models.Event{
				{
					Name:     "leading space",
					Location: "trailing space",
					Start:    "2025-04-11T11:00:00",
					End:      "2025-04-11T12:00:00",
				},
				{
					Name:     "both sides",
					Location: "extra  spaces",
					Start:    "2025-04-11T13:00:00",
					End:      "2025-04-11T14:00:00",
				},
			},
			err: nil,
		},
		{
			name: "encoded strings",
			events: []models.Event{
				{
					Name:     "Basketball &amp; Volleyball",
					Location: "Court 1 &gt; Court 2",
					Start:    "2025-04-11T11:00:00",
					End:      "2025-04-11T12:00:00",
				},
				{
					Name:     "&quot;Special&quot; Event",
					Location: "Pool &apos;A&apos;",
					Start:    "2025-04-11T13:00:00",
					End:      "2025-04-11T14:00:00",
				},
			},
			expected: []models.Event{
				{
					Name:     "Basketball & Volleyball",
					Location: "Court 1 > Court 2",
					Start:    "2025-04-11T11:00:00",
					End:      "2025-04-11T12:00:00",
				},
				{
					Name:     "\"Special\" Event",
					Location: "Pool 'A'",
					Start:    "2025-04-11T13:00:00",
					End:      "2025-04-11T14:00:00",
				},
			},
			err: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual := mapEscapeStrings(tt.events)
			if len(actual) != len(tt.expected) {
				t.Errorf("TestMapEscapeStrings - %s: got %d events, want %d events", tt.name, len(actual), len(tt.expected))
				return
			}
			for i, event := range tt.expected {
				if actual[i] != event {
					t.Errorf("TestMapEscapeStrings - %s: event %d mismatch:\ngot:  %+v\nwant: %+v", tt.name, i, actual[i], event)
				}
			}
		})
	}
}

func TestReduceEventsToFacilityEvents(t *testing.T) {
	tests := []struct {
		name     string
		events   []models.Event
		expected models.FacilityEvents
	}{
		{
			name:     "empty input",
			events:   []models.Event{},
			expected: models.FacilityEvents{},
		},
		{
			name: "mixed facility types",
			events: []models.Event{
				{
					Name:     "Basketball",
					Location: "Court 1",
					Start:    "2025-04-11T11:00:00",
					End:      "2025-04-11T12:00:00",
				},
				{
					Name:     "Climbing",
					Location: "Mount Mendota",
					Start:    "2025-04-11T13:00:00",
					End:      "2025-04-11T14:00:00",
				},
				{
					Name:     "Swimming",
					Location: "Pool A",
					Start:    "2025-04-11T15:00:00",
					End:      "2025-04-11T16:00:00",
				},
				{
					Name:     "Hockey",
					Location: "Ice Rink",
					Start:    "2025-04-11T17:00:00",
					End:      "2025-04-11T18:00:00",
				},
				{
					Name:     "Gaming",
					Location: "Esports Room",
					Start:    "2025-04-11T19:00:00",
					End:      "2025-04-11T20:00:00",
				},
				{
					Name:     "Unknown Event 1",
					Location: "Random Room",
					Start:    "2025-04-11T21:00:00",
					End:      "2025-04-11T22:00:00",
				},
				{
					Name:     "Unknown Event 2",
					Location: "Mystery Location",
					Start:    "2025-04-11T23:00:00",
					End:      "2025-04-12T00:00:00",
				},
			},
			expected: models.FacilityEvents{
				Courts: []models.Event{
					{
						Name:     "Basketball",
						Location: "Court 1",
						Start:    "2025-04-11T11:00:00",
						End:      "2025-04-11T12:00:00",
					},
				},
				MtMendota: []models.Event{
					{
						Name:     "Climbing",
						Location: "Mount Mendota",
						Start:    "2025-04-11T13:00:00",
						End:      "2025-04-11T14:00:00",
					},
				},
				Pool: []models.Event{
					{
						Name:     "Swimming",
						Location: "Pool A",
						Start:    "2025-04-11T15:00:00",
						End:      "2025-04-11T16:00:00",
					},
				},
				IceRink: []models.Event{
					{
						Name:     "Hockey",
						Location: "Ice Rink",
						Start:    "2025-04-11T17:00:00",
						End:      "2025-04-11T18:00:00",
					},
				},
				Esports: []models.Event{
					{
						Name:     "Gaming",
						Location: "Esports Room",
						Start:    "2025-04-11T19:00:00",
						End:      "2025-04-11T20:00:00",
					},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual := reduceEventsToFacilityEvents(tt.events)
			if len(actual.Courts) != len(tt.expected.Courts) ||
				len(actual.MtMendota) != len(tt.expected.MtMendota) ||
				len(actual.Pool) != len(tt.expected.Pool) ||
				len(actual.IceRink) != len(tt.expected.IceRink) ||
				len(actual.Esports) != len(tt.expected.Esports) {
				t.Errorf("TestReduceEventsToFacilityEvents - %s: got different facility counts", tt.name)
				return
			}

			// Compare individual events in each facility
			if !compareEvents(actual.Courts, tt.expected.Courts) ||
				!compareEvents(actual.MtMendota, tt.expected.MtMendota) ||
				!compareEvents(actual.Pool, tt.expected.Pool) ||
				!compareEvents(actual.IceRink, tt.expected.IceRink) ||
				!compareEvents(actual.Esports, tt.expected.Esports) {
				t.Errorf("TestReduceEventsToFacilityEvents - %s: events mismatch", tt.name)
			}
		})
	}
}

func compareEvents(a, b []models.Event) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func TestFetchSchedule(t *testing.T) {
	tests := []struct {
		name    string
		date    time.Time
		gym     string
		wantErr bool
	}{
		{
			name:    "bakke april 28",
			date:    time.Date(2025, 4, 28, 0, 0, 0, 0, time.UTC),
			gym:     "bakke",
			wantErr: false,
		},
		{
			name:    "bakke april 29",
			date:    time.Date(2025, 4, 29, 0, 0, 0, 0, time.UTC),
			gym:     "bakke",
			wantErr: false,
		},
		{
			name:    "bakke april 30",
			date:    time.Date(2025, 4, 30, 0, 0, 0, 0, time.UTC),
			gym:     "bakke",
			wantErr: false,
		},
		{
			name:    "nick april 28",
			date:    time.Date(2025, 4, 28, 0, 0, 0, 0, time.UTC),
			gym:     "nick",
			wantErr: false,
		},
		{
			name:    "nick april 29",
			date:    time.Date(2025, 4, 29, 0, 0, 0, 0, time.UTC),
			gym:     "nick",
			wantErr: false,
		},
		{
			name:    "nick april 30",
			date:    time.Date(2025, 4, 30, 0, 0, 0, 0, time.UTC),
			gym:     "nick",
			wantErr: false,
		},
		{
			name:    "invalid gym",
			date:    time.Date(2025, 4, 28, 0, 0, 0, 0, time.UTC),
			gym:     "recplex",
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			events, err := fetchSchedule(tt.date, tt.gym)
			if tt.wantErr {
				if err == nil {
					t.Error("expected error but got none")
				}
				return
			}
			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}

			// Check all events for whitespace
			allEvents := []models.Event{}
			allEvents = append(allEvents, events.Courts...)
			allEvents = append(allEvents, events.MtMendota...)
			allEvents = append(allEvents, events.Pool...)
			allEvents = append(allEvents, events.IceRink...)
			allEvents = append(allEvents, events.Esports...)

			for _, event := range allEvents {
				// Check for extra whitespace
				if strings.TrimSpace(event.Name) != event.Name {
					t.Errorf("event name has extra whitespace: '%s'", event.Name)
				}
				if strings.TrimSpace(event.Location) != event.Location {
					t.Errorf("event location has extra whitespace: '%s'", event.Location)
				}

				// Parse and validate times
				start, err := time.Parse(time.RFC3339, event.Start)
				if err != nil {
					t.Errorf("invalid start time format: %s", event.Start)
				}
				end, err := time.Parse(time.RFC3339, event.End)
				if err != nil {
					t.Errorf("invalid end time format: %s", event.End)
				}

				// Convert to Chicago time
				loc, _ := time.LoadLocation("America/Chicago")
				startChicago := start.In(loc)
				endChicago := end.In(loc)

				// Check if events are between 6AM and next day 6PM
				dayStart := time.Date(tt.date.Year(), tt.date.Month(), tt.date.Day(), 6, 0, 0, 0, loc)
				dayEnd := dayStart.Add(18 * time.Hour) // Midnight

				if startChicago.Before(dayStart) || startChicago.After(dayEnd) {
					t.Errorf("event start time %v outside valid range [%v, %v]", startChicago, dayStart, dayEnd)
				}
				if endChicago.Before(dayStart) || endChicago.After(dayEnd) {
					t.Errorf("event end time %v outside valid range [%v, %v]", endChicago, dayStart, dayEnd)
				}
			}
		})
	}
}
