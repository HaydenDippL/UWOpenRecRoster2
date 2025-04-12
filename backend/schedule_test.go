package main

import (
	"UWOpenRecRoster2-Backend/models"
	"testing"
)

func TestConvertEventsToSchedule(t *testing.T) {
	tests := []struct {
		name     string
		events   models.EventsRaw
		expected models.FacilityEvents
	}{
		{
			name: "sort multiple facilities",
			events: models.EventsRaw{
				Events: []models.EventRaw{
					{
						EventName:  "Basketball",
						Location:   "Court 1",
						EventStart: "2025-04-11T11:00:00",
						EventEnd:   "2025-04-11T12:00:00",
					},
					{
						EventName:  "Swim Practice",
						Location:   "Pool Lane 1",
						EventStart: "2025-04-11T13:00:00",
						EventEnd:   "2025-04-11T14:00:00",
					},
					{
						EventName:  "Gaming Tournament",
						Location:   "Esports Arena",
						EventStart: "2025-04-11T15:00:00",
						EventEnd:   "2025-04-11T16:00:00",
					},
					{
						EventName:  "Climbing",
						Location:   "Mount Mendota",
						EventStart: "2025-04-11T17:00:00",
						EventEnd:   "2025-04-11T18:00:00",
					},
					{
						EventName:  "Hockey",
						Location:   "Ice Rink",
						EventStart: "2025-04-11T19:00:00",
						EventEnd:   "2025-04-11T20:00:00",
					},
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
				Pool: []models.Event{
					{
						Name:     "Swim Practice",
						Location: "Pool Lane 1",
						Start:    "2025-04-11T13:00:00",
						End:      "2025-04-11T14:00:00",
					},
				},
				Esports: []models.Event{
					{
						Name:     "Gaming Tournament",
						Location: "Esports Arena",
						Start:    "2025-04-11T15:00:00",
						End:      "2025-04-11T16:00:00",
					},
				},
				MtMendota: []models.Event{
					{
						Name:     "Climbing",
						Location: "Mount Mendota",
						Start:    "2025-04-11T17:00:00",
						End:      "2025-04-11T18:00:00",
					},
				},
				IceRink: []models.Event{
					{
						Name:     "Hockey",
						Location: "Ice Rink",
						Start:    "2025-04-11T19:00:00",
						End:      "2025-04-11T20:00:00",
					},
				},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual := convertEventsToSchedule(tt.events)

			// Compare each facility's events
			if len(actual.Courts) != len(tt.expected.Courts) {
				t.Errorf("Courts events count mismatch: got %v, want %v", len(actual.Courts), len(tt.expected.Courts))
			}
			if len(actual.Pool) != len(tt.expected.Pool) {
				t.Errorf("Pool events count mismatch: got %v, want %v", len(actual.Pool), len(tt.expected.Pool))
			}
			if len(actual.Esports) != len(tt.expected.Esports) {
				t.Errorf("Esports events count mismatch: got %v, want %v", len(actual.Esports), len(tt.expected.Esports))
			}
			if len(actual.MtMendota) != len(tt.expected.MtMendota) {
				t.Errorf("MtMendota events count mismatch: got %v, want %v", len(actual.MtMendota), len(tt.expected.MtMendota))
			}
			if len(actual.IceRink) != len(tt.expected.IceRink) {
				t.Errorf("IceRink events count mismatch: got %v, want %v", len(actual.IceRink), len(tt.expected.IceRink))
			}

			// Compare individual events
			for i, event := range tt.expected.Courts {
				if actual.Courts[i] != event {
					t.Errorf("Courts event mismatch at index %d: got %v, want %v", i, actual.Courts[i], event)
				}
			}
			for i, event := range tt.expected.Pool {
				if actual.Pool[i] != event {
					t.Errorf("Pool event mismatch at index %d: got %v, want %v", i, actual.Pool[i], event)
				}
			}
			for i, event := range tt.expected.Esports {
				if actual.Esports[i] != event {
					t.Errorf("Esports event mismatch at index %d: got %v, want %v", i, actual.Esports[i], event)
				}
			}
			for i, event := range tt.expected.MtMendota {
				if actual.MtMendota[i] != event {
					t.Errorf("MtMendota event mismatch at index %d: got %v, want %v", i, actual.MtMendota[i], event)
				}
			}
			for i, event := range tt.expected.IceRink {
				if actual.IceRink[i] != event {
					t.Errorf("IceRink event mismatch at index %d: got %v, want %v", i, actual.IceRink[i], event)
				}
			}
		})
	}
}

func TestTransformAndDecodeRawEvent(t *testing.T) {
	tests := []struct {
		name     string
		event    models.EventRaw
		expected models.Event
	}{
		{
			name: "whitespace check",
			event: models.EventRaw{
				EventName:  "Open Rec Pickleball ",
				Location:   "Court 4",
				EventStart: "2025-04-11T11:00:00",
				EventEnd:   "2025-04-11T21:30:00",
			}, expected: models.Event{
				Name:     "Open Rec Pickleball",
				Location: "Court 4",
				Start:    "2025-04-11T11:00:00",
				End:      "2025-04-11T21:30:00",
			},
		},
		{
			name: "html decode check",
			event: models.EventRaw{
				EventName:  "Sports Leadership Program &amp; Rec Well",
				Location:   "Court 3",
				EventStart: "2025-04-11T13:30:00",
				EventEnd:   "2025-04-11T14:30:00",
			},
			expected: models.Event{
				Name:     "Sports Leadership Program & Rec Well",
				Location: "Court 3",
				Start:    "2025-04-11T13:30:00",
				End:      "2025-04-11T14:30:00",
			},
		},
	}

	for i, test := range tests {
		actual := transformAndDecodeRawEvent(test.event)
		if actual != test.expected {
			t.Errorf("transformAndDecodeRawEvent() on test %d\n"+
				"event: %v\n"+
				"expected: %v\n"+
				"actual: %v", i, test.event, test.expected, actual)
		}
	}
}
