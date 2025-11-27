# Feature Specification: Tournament Forecast System

**Feature Branch**: `001-tournament-forecast-system`  
**Created**: 2025-11-21  
**Status**: Draft  
**Input**: User description: "Build an application that will be used for managing tournaments based on sport events. Events should have teams which participate in 1 vs 1 matches following predefined schedules (date/time). Users then will be able to submit forecasts for the score of these matches and they will obtain points based on sets of rules that compare their forecast with the event score. The application should support two main user personas administrators and participants. Administrators will be in charge of defining the events, participating teams, the matches, updating the match score and define the scoring rules and which participants are allowed to submit forecasts. Participants are allowed to view the events that they are part of, submit forecasts for the matches and see what score they have received based on the match result."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Participant Submit Match Forecast (Priority: P1)

A participant views upcoming matches in their assigned tournament and submits score predictions before the match starts. After the match completes and the administrator enters the actual score, the participant sees their earned points based on how close their forecast was to the actual result.

**Why this priority**: This is the core value proposition - enabling participants to make predictions and see their performance. Without this, the application has no user-facing functionality.

**Independent Test**: Can be fully tested by creating a tournament with matches, inviting a participant, having them submit forecasts, updating match scores, and verifying point calculations. Delivers immediate value as a working prediction system.

**Acceptance Scenarios**:

1. **Given** a participant is assigned to a tournament with scheduled matches, **When** they view the tournament, **Then** they see all upcoming matches with teams, dates, and times
2. **Given** a participant views an upcoming match, **When** they submit a score forecast (e.g., Team A: 2, Team B: 1) before the match starts, **Then** the forecast is saved and confirmed
3. **Given** a participant has submitted a forecast, **When** they view the match again, **Then** they see their previously submitted forecast
4. **Given** a match has ended and the administrator entered the actual score, **When** the participant views the match, **Then** they see the actual score and the points they earned
5. **Given** a match has already started, **When** a participant tries to submit a forecast, **Then** the system prevents submission with a clear message
6. **Given** a participant has submitted forecasts for multiple matches, **When** they view their tournament dashboard, **Then** they see their total points and ranking among other participants

---

### User Story 2 - Administrator Manage Tournament Setup (Priority: P2)

An administrator creates a new tournament, defines participating teams, schedules matches with dates and times, and assigns participants who are allowed to submit forecasts. This creates the foundation for participants to engage with the tournament.

**Why this priority**: Essential for tournament creation and management, but the administrator workflow is secondary to proving the participant experience works. Can be built after core forecasting functionality.

**Independent Test**: Can be tested by logging in as an administrator, creating a complete tournament from scratch including teams and matches, inviting participants, and verifying all data is properly saved and visible.

**Acceptance Scenarios**:

1. **Given** an administrator is logged in, **When** they create a new tournament with a name and description, **Then** the tournament is created and appears in their tournament list
2. **Given** an administrator has created a tournament, **When** they add teams (each with a name), **Then** the teams are saved and available for match scheduling
3. **Given** an administrator has added teams to a tournament, **When** they schedule a match by selecting two teams and a date/time, **Then** the match is created and visible in the tournament schedule
4. **Given** an administrator has scheduled matches, **When** they add participants by email or username, **Then** the participants are granted access to view the tournament and submit forecasts
5. **Given** an administrator views a tournament, **When** they edit team names, match schedules, or participant lists, **Then** changes are saved and reflected immediately
6. **Given** an administrator has created multiple tournaments, **When** they view their dashboard, **Then** they see all tournaments they manage with key statistics (number of matches, participants, completion status)

---

### User Story 3 - Administrator Update Match Results and Scoring Rules (Priority: P3)

After a match completes, an administrator enters the actual score, triggering automatic point calculations for all participants who submitted forecasts. Administrators can also define and customize the scoring rules that determine how points are awarded based on forecast accuracy.

**Why this priority**: Required for completing the prediction cycle, but depends on P1 and P2 being functional. Scoring rules can start with reasonable defaults (e.g., exact score = 5 points, correct winner = 2 points, wrong = 0 points).

**Independent Test**: Can be tested by creating a tournament with matches and forecasts, entering match results, and verifying that points are calculated correctly according to defined rules. Can also test customizing scoring rules and recalculating points.

**Acceptance Scenarios**:

1. **Given** an administrator views a match that has started or completed, **When** they enter the actual score (e.g., Team A: 3, Team B: 2), **Then** the score is saved and all participant forecasts are automatically scored
2. **Given** an administrator has entered a match result, **When** participants view the match, **Then** they see the actual score and their awarded points
3. **Given** an administrator views scoring rules for a tournament, **When** they define point values (e.g., exact score: 5 pts, correct winner: 2 pts, incorrect: 0 pts), **Then** the rules are saved
4. **Given** scoring rules have been defined, **When** an administrator enters match results, **Then** points are calculated using the current rules
5. **Given** an administrator updates scoring rules after some matches are completed, **When** they trigger a recalculation, **Then** all historical points are recalculated using the new rules
6. **Given** an administrator enters an incorrect match score, **When** they correct it, **Then** all participant points are automatically recalculated

---

### User Story 4 - Participant View Tournament Leaderboard (Priority: P4)

Participants can view a leaderboard showing all participants in their tournament ranked by total points, including their own position, fostering competition and engagement.

**Why this priority**: Enhances user engagement but not essential for core functionality. Can be added after the basic forecast-submit-score cycle works.

**Independent Test**: Can be tested by creating a tournament with multiple participants who have submitted forecasts and received points, then verifying the leaderboard displays correctly sorted rankings with accurate point totals.

**Acceptance Scenarios**:

1. **Given** a participant is part of a tournament, **When** they view the leaderboard, **Then** they see all participants ranked by total points in descending order
2. **Given** a participant views the leaderboard, **When** they locate their own ranking, **Then** their entry is visually highlighted
3. **Given** match results have been updated, **When** a participant refreshes the leaderboard, **Then** rankings reflect the latest point calculations
4. **Given** multiple participants have the same point total, **When** they appear on the leaderboard, **Then** they are sorted by additional tie-breaking criteria (e.g., number of exact score predictions, alphabetically by name)

---

### Edge Cases

- What happens when a participant submits a forecast after the match start time but before the result is entered? System must reject the forecast.
- What happens when an administrator deletes a team that is scheduled in future matches? System must prevent deletion or cascade update to remove affected matches with warnings.
- What happens when an administrator removes a participant who has already submitted forecasts? Forecasts should remain for historical record but participant loses access to view new matches.
- What happens when multiple administrators manage the same tournament? System must prevent data corruption from concurrent edits and provide clear feedback to administrators when conflicts occur.
- What happens when a match is postponed or cancelled? Administrator should be able to update match status, preventing forecast submission and excluding it from point calculations.
- What happens when scoring rules are changed mid-tournament? System should track rule versions per match or offer recalculation with administrator confirmation.
- What happens when a participant tries to submit invalid forecast data (negative scores, non-numeric values)? System must validate input and show clear error messages.
- What happens when the system experiences downtime just before a match starts? Participants who couldn't submit forecasts should not be penalized (match exclusion or grace period extension).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow administrators to create tournaments with name, description, and start/end dates
- **FR-002**: System MUST allow administrators to add teams to tournaments with unique team names
- **FR-003**: System MUST allow administrators to schedule matches by selecting two teams from a tournament and specifying date/time
- **FR-004**: System MUST enforce that matches can only be between two different teams (no team vs itself)
- **FR-005**: System MUST allow administrators to assign participants to tournaments, granting them view and forecast permissions
- **FR-006**: System MUST allow participants to view only tournaments they have been explicitly assigned to
- **FR-007**: System MUST allow participants to view all scheduled matches within their assigned tournaments
- **FR-008**: System MUST allow participants to submit score forecasts for upcoming matches (both team scores required)
- **FR-009**: System MUST prevent participants from submitting or editing forecasts after the match scheduled start time
- **FR-010**: System MUST allow participants to view and edit their submitted forecasts before the match starts
- **FR-011**: System MUST allow administrators to enter actual match results (scores for both teams)
- **FR-012**: System MUST automatically calculate participant points when match results are entered, based on defined scoring rules
- **FR-013**: System MUST allow administrators to define scoring rules with point values for: exact score match, correct winner, and incorrect prediction
- **FR-014**: System MUST persist forecasts, match results, scoring rules, and calculated points
- **FR-015**: System MUST display participant's total points across all scored matches in a tournament
- **FR-016**: System MUST display a leaderboard ranking participants by total points
- **FR-017**: System MUST support multiple concurrent tournaments without data interference
- **FR-018**: System MUST authenticate users and distinguish between administrator and participant roles
- **FR-019**: System MUST validate forecast inputs (non-negative integers for scores)
- **FR-020**: System MUST display clear error messages for invalid operations (late forecasts, invalid scores, unauthorized access)
- **FR-021**: System MUST handle timezone conversions for match scheduling to ensure consistent start time enforcement
- **FR-022**: System MUST prevent administrators from deleting tournaments that have active participants or completed matches without explicit confirmation
- **FR-023**: System MUST allow administrators to edit match schedules before the match starts
- **FR-024**: System MUST log all administrator actions (tournament creation, score updates, rule changes) for audit purposes

### Key Entities

- **User**: Represents a person using the system; has a role (Administrator or Participant); has authentication credentials; associated with zero or more tournaments
- **Tournament**: Represents a competition event; has a name, description, start/end dates; contains teams, matches, participants, and scoring rules; owned by one or more administrators
- **Team**: Represents a competing entity within a tournament; has a name; participates in multiple matches
- **Match**: Represents a scheduled 1v1 game between two teams; has scheduled date/time, two teams, optional actual scores, status (upcoming/in-progress/completed); belongs to one tournament
- **Forecast**: Represents a participant's prediction; has predicted scores for both teams, submission timestamp; linked to one participant, one match
- **ScoringRule**: Represents point calculation logic; has point values for exact score match, correct winner prediction, incorrect prediction; belongs to one tournament; may have version/effective date
- **ParticipantScore**: Represents calculated points for a participant; has total points; linked to one participant, one tournament. Per-match point breakdowns are available via linked forecasts.
- **TournamentParticipant**: Represents the relationship between users and tournaments; indicates which participants have access to which tournaments

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Participants can submit a match forecast in under 30 seconds from viewing the match list
- **SC-002**: Administrators can create a complete tournament (with 4 teams, 6 matches, and 10 participants) in under 5 minutes
- **SC-003**: Point calculations are completed within 2 seconds after an administrator enters match results
- **SC-004**: System supports at least 100 concurrent participants submitting forecasts without performance degradation
- **SC-005**: 95% of forecast submissions succeed on the first attempt without validation errors
- **SC-006**: Leaderboard displays updated rankings within 5 seconds of match result entry
- **SC-007**: 99.99% of concurrent administrator edits to tournament settings complete successfully without data corruption; all concurrent edits are serialized or merged without data loss through conflict resolution
- **SC-008**: Participants can view their complete forecast history and earned points for all matches with 100% accuracy
- **SC-009**: All forecast submission deadlines are enforced within 1-second accuracy of match start time
- **SC-010**: All authorization checks are enforced and tested for role-based access control (e.g., participants cannot view other tournaments or enter scores), with 99.99% of unauthorized access attempts prevented in security testing.
