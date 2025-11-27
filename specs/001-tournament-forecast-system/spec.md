# Feature Specification: Tournament Forecast System

**Feature Branch**: `001-tournament-forecast-system`  
**Created**: 2025-11-21  
**Status**: Draft  
**Input**: User description: "Build an application that will be used for managing tournaments based on sport events. Events should have teams which participate on 1 vs 1 matches following predefined schedules (date/time). Users then will be able to submit forecasts for the score of these matches and they will obtain points based on sets of rules that compare their forecast with the event score. The application should support two main user personas administrators and participants. Administrators will be in charge of defining the events, participating teams, the matches, updating the match score and define the scoring rules and which participants are allowed to submit forecasts. Participants are allowed to view the events that they are part of, submit forecasts for the matches and see what score they have received based on the match result."

## Clarifications

### Session 2025-11-26

- Q: What authentication method should the system use? → A: Email magic links (passwordless authentication), with OAuth/SSO as a secondary option for future expansion
- Q: What should the default scoring rules be? → A: Graduated scale - 5 points for exact score, 3 points for correct winner with goal difference within 1, 1 point for correct winner, 0 points for incorrect prediction
- Q: How should match date/time information be stored and displayed? → A: All match date/time information must be stored in UTC format and converted to users' local timezone for display purposes
- Q: What are the possible match statuses? → A: Matches can have the following statuses: upcoming (scheduled but not started, forecasts allowed), in-progress (match has started, forecasts locked), completed (final score entered, points calculated), postponed (rescheduled to future date, forecasts locked), cancelled (will not be played, excluded from scoring)
- Q: How are postponed matches handled? → A: When a match is marked as postponed, the administrator must provide a new date/time (replacing the original schedule). The match status changes back to "upcoming" once rescheduled, and participants can submit forecasts again if they haven't already, or edit existing forecasts until the new start time. If no new date/time is set, the match remains in "postponed" status and forecasts stay locked.
- Q: How are scoring rule versions handled and how do changes impact existing matches? → A: Each match is associated with the scoring rule version active at the time the match was created. When an administrator modifies scoring rules, they can choose to: (1) apply changes only to future matches (default - preserves historical accuracy), or (2) recalculate all historical points for completed matches using the new rules (requires explicit confirmation). Matches retain their original scoring rule version unless manually recalculated, ensuring consistent point calculations even after rule changes.
- Q: What are the session timeout and rate limiting policies for authentication? → A: Security Baseline - 1-hour session timeout with "remember me" option (7 days), rate limit 5 magic link requests per email per hour
- Q: What is the data retention policy for user data and tournament history? → A: Indefinite Retention - Keep all data forever
- Q: What monitoring and alerting requirements should the system have? → A: Production-Ready Monitoring - Monitor uptime, error rates, forecast submission success rate, point calculation latency, concurrent users; alert on: downtime >1min, error rate >5%, calculation time >5s
- Q: How should the system handle email magic link delivery failures? → A: Fail Fast - Display error immediately, no retry; user must request new link
- Q: What database should the system use for persistent storage? → A: Deferred - Select database during technical planning based on deployment target
- Q: How should matches be handled when participants are unable to submit forecasts due to system downtime? → A: Matches affected by system downtime (occurring within the forecast submission window before match start) should be automatically excluded from scoring for all participants to ensure fairness; administrators should be notified of affected matches and have the option to manually reinstate them if appropriate
- Q: What information is required for user registration? → A: Users must provide a unique, valid email address (used for authentication via magic links and system communication) and a unique username (displayed in tournament leaderboards, match forecasts, and other user-facing flows)
- Q: How should the system handle participants with the same point total on the leaderboard? → A: The system does not perform any form of tie-breaking; participants with identical scores share the same place in the leaderboard
- Q: Can teams and team information be edited after a tournament has started? → A: No - once a tournament has started, teams and team-specific information (such as team names) cannot be added, deleted, or modified to maintain data integrity and prevent confusion for participants who have already submitted forecasts
- Q: How should the system handle concurrent match result submissions by multiple administrators? → A: The system must prevent data corruption by detecting concurrent edits. When a conflict occurs (e.g., two administrators attempt to update the same match result simultaneously), the system must reject the conflicting operation, display a clear error message indicating that another administrator has already updated the result, show the current state of the match result, and allow the administrator to review and resubmit if necessary.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Participant Submit and Track Match Forecasts (Priority: P1)

A participant views upcoming matches in their assigned tournament and submits score predictions before the match starts. After the match completes and the administrator enters the actual score, the participant sees their earned points for each match and can track their total points across all matches.

**Why this priority**: This is the core value proposition - enabling participants to make predictions and see their individual performance. Without this, the application has no user-facing functionality. This story focuses solely on individual forecast submission and point tracking, making it independently testable.

**Independent Test**: Can be fully tested by creating a tournament with matches, inviting a single participant, having them submit forecasts, updating match scores, and verifying point calculations are displayed correctly for that participant. Delivers immediate value as a working prediction system without requiring multiple participants or leaderboard features.

**Acceptance Scenarios**:

1. **Given** a participant is assigned to a tournament with scheduled matches, **When** they view the tournament, **Then** they see all upcoming matches with teams, dates, and times
2. **Given** a participant views an upcoming match, **When** they submit a score forecast (e.g., Team A: 2, Team B: 1) before the match starts, **Then** the forecast is saved and confirmed
3. **Given** a participant has submitted a forecast, **When** they view the match again, **Then** they see their previously submitted forecast
4. **Given** a match has ended and the administrator entered the actual score, **When** the participant views the match, **Then** they see the actual score and the points they earned for that specific match
5. **Given** a match has already started, **When** a participant tries to submit a forecast, **Then** the system prevents submission with a clear message
6. **Given** a participant has submitted forecasts for multiple matches, **When** they view their tournament dashboard, **Then** they see their total accumulated points across all completed matches

---

### User Story 2 - Participant Compare Performance with Others (Priority: P2)

A participant can view their ranking compared to other participants in the tournament through a leaderboard that displays all participants sorted by total points. This enables competitive engagement and social comparison among participants.

**Why this priority**: While important for engagement and competition, this story depends on having the basic forecasting and scoring functionality working (P1). A participant can still derive value from submitting forecasts and tracking their own points without seeing how they rank against others.

**Independent Test**: Can be tested by creating a tournament with multiple participants who have submitted forecasts and received points, then verifying the leaderboard displays correctly sorted rankings with accurate point totals and the participant can see their position among others.

**Acceptance Scenarios**:

1. **Given** a participant is part of a tournament with other participants, **When** they view the leaderboard, **Then** they see all participants ranked by total points in descending order
2. **Given** a participant views the leaderboard, **When** they locate their own ranking, **Then** their entry is visually highlighted or distinguished from others
3. **Given** match results have been updated, **When** a participant refreshes the leaderboard, **Then** rankings reflect the latest point calculations
4. **Given** multiple participants have the same point total, **When** they appear on the leaderboard, **Then** they share the same rank position with no tie-breaking applied
5. **Given** a participant views the leaderboard, **When** they see another participant's ranking, **Then** they can view that participant's total points but cannot view their individual forecasts for upcoming or in-progress matches
6. **Given** a match has been completed and scored, **When** a participant views match details, **Then** they can see all participants' forecasts for that specific match along with points earned
7. **Given** a tournament has no completed matches, **When** a participant views the leaderboard, **Then** they see all participants with 0 points or a message indicating no scores are available yet

---

### User Story 3 - Administrator Manage Tournament Setup (Priority: P3)

An administrator creates a new tournament, defines participating teams, schedules matches with dates and times, and assigns participants who are allowed to submit forecasts. This creates the foundation for participants to engage with the tournament.

**Why this priority**: Essential for tournament creation and management, but the administrator workflow is secondary to proving the participant experience works. Can be built after core forecasting and comparison functionality.

**Independent Test**: Can be tested by logging in as an administrator, creating a complete tournament from scratch including teams and matches, inviting participants, and verifying all data is properly saved and visible.

**Acceptance Scenarios**:

1. **Given** an administrator is logged in, **When** they create a new tournament with a name and description, **Then** the tournament is created and appears in their tournament list
2. **Given** an administrator has created a tournament, **When** they add teams (each with a name), **Then** the teams are saved and available for match scheduling
3. **Given** an administrator has added teams to a tournament, **When** they schedule a match by selecting two teams and a date/time, **Then** the match is created and visible in the tournament schedule
4. **Given** an administrator has scheduled matches, **When** they add participants by username, **Then** the participants are granted access to view the tournament and submit forecasts
5. **Given** an administrator views a tournament that has not started, **When** they edit team names, match schedules, or participant lists, **Then** changes are saved and reflected immediately
6. **Given** an administrator has created multiple tournaments, **When** they view their dashboard, **Then** they see all tournaments they manage with key statistics (number of matches, participants, completion status)
7. **Given** a tournament has started, **When** an administrator attempts to add or delete teams or participants, **Then** the system prevents the operation with a clear message indicating that tournament composition cannot be changed after it has started

---

### User Story 4 - Administrator Update Match Results and Scoring Rules (Priority: P4)

After a match completes, an administrator enters the actual score, triggering automatic point calculations for all participants who submitted forecasts. Administrators can also define and customize the scoring rules that determine how points are awarded based on forecast accuracy.

**Why this priority**: Required for completing the prediction cycle, but depends on P1, P2, and P3 being functional. Scoring rules can start with a reasonable default graduated scale (5 points for exact score, 3 points for correct winner with goal difference within 1, 1 point for correct winner, 0 points for incorrect).

**Independent Test**: Can be tested by creating a tournament with matches and forecasts, entering match results, and verifying that points are calculated correctly according to defined rules. Can also test customizing scoring rules and recalculating points.

**Acceptance Scenarios**:

1. **Given** an administrator views a match that has started or completed, **When** they enter the actual score (e.g., Team A: 3, Team B: 2), **Then** the score is saved and all participant forecasts are automatically scored
2. **Given** an administrator has entered a match result, **When** participants view the match, **Then** they see the actual score and their awarded points
3. **Given** an administrator views scoring rules for a tournament, **When** they define point values (e.g., exact score: 5 pts, correct winner: 2 pts, incorrect: 0 pts), **Then** the rules are saved
4. **Given** scoring rules have been defined, **When** an administrator enters match results, **Then** points are calculated using the current rules
5. **Given** an administrator updates scoring rules after some matches are completed, **When** they trigger a recalculation, **Then** all historical points are recalculated using the new rules
6. **Given** an administrator enters an incorrect match score, **When** they correct it, **Then** all participant points are automatically recalculated
7. **Given** a tournament has started with scheduled matches, **When** an administrator attempts to edit or delete a match that has not yet started or been scored, **Then** the system allows the operation and updates the match details or removes the match
8. **Given** a tournament has started with scheduled matches, **When** an administrator attempts to edit or delete a match that has already started or been scored, **Then** the system prevents the operation with a clear message indicating that matches cannot be modified once they have started or been scored
9. **Given** a tournament has started, **When** an administrator attempts to add a new match scheduled for a future date/time between two teams already participating in the tournament, **Then** the system allows the operation and adds the match to the tournament schedule

---

### Edge Cases

- What happens when a participant submits a forecast after the match start time but before the result is entered? System must reject the forecast.
- What happens when an administrator deletes a team that is scheduled in future matches? System must prevent deletion or cascade update to remove affected matches with warnings.
- What happens when an administrator removes a participant who has already submitted forecasts? Forecasts should remain for historical record but participant loses access to view new matches.
- What happens when multiple administrators manage the same tournament? System must prevent data corruption from concurrent edits by detecting conflicts. When conflicts occur (e.g., simultaneous match result updates), the system must reject the conflicting operation, display a clear error message stating "Another administrator has updated this match. Please review the current result and try again.", show the current match state including the updated result and which administrator made the change, and allow the administrator to review before resubmitting.
- What happens when a match is postponed or cancelled? Administrator should be able to update match status, preventing forecast submission and excluding it from point calculations.
- What happens when a postponed match is rescheduled? The match status returns to "upcoming" with the new date/time, and participants can submit or edit forecasts until the new start time.
- What happens when scoring rules are changed mid-tournament? By default, existing matches retain their original scoring rule version and only future matches use the new rules. Administrators can optionally trigger a recalculation to apply new rules to all historical matches with explicit confirmation.
- What happens to points when scoring rules are recalculated? All participant points for affected matches are recalculated using the new rule version, and leaderboard rankings are automatically updated to reflect the new point totals.
- What happens when a participant tries to submit invalid forecast data (negative scores, non-numeric values)? System must validate input and show clear error messages.
- What happens when the system experiences downtime just before a match starts? System must automatically exclude affected matches from scoring for all participants to ensure fairness. Administrators must be notified of downtime-affected matches and can manually review and reinstate matches if appropriate (e.g., if downtime was brief and most participants had already submitted forecasts).

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
- **FR-011**: System MUST allow administrators to enter actual match results (scores for both teams), allow administrators to correct previously entered match results, automatically recalculate all participant points when results are corrected, and MUST prevent participants from entering or modifying match results
- **FR-012**: System MUST automatically calculate participant points when match results are entered, based on defined scoring rules
- **FR-013**: System MUST allow administrators to define custom scoring rules (such as exact score prediction, correct winner, point multipliers, or other criteria), require at least one scoring rule to be defined for each match, and provide a default graduated scoring template (5 points for exact score, 3 points for correct winner with goal difference within 1, 1 point for correct winner, 0 points for incorrect prediction) that administrators can use or customize for their tournaments
- **FR-014**: System MUST associate each match with the scoring rule version active at the time of match creation, ensuring matches retain their original scoring rule version unless explicitly recalculated
- **FR-015**: System MUST allow administrators to modify scoring rules with options to either apply changes only to future matches (default behavior) or recalculate all historical points for completed matches using new rules (requiring explicit confirmation)
- **FR-016**: System MUST persist forecasts, match results, scoring rules, and calculated points
- **FR-017**: System MUST display participant's total points across all scored matches in a tournament
- **FR-018**: System MUST display a leaderboard ranking participants by total points
- **FR-019**: System MUST allow participants to view other participants' total points and scores at all times, but MUST only allow participants to view other participants' individual match forecasts after those matches have been completed and scored
- **FR-020**: System MUST support multiple concurrent tournaments without data interference
- **FR-021**: System MUST require users to register with a unique, valid email address and a unique username during account creation, validating email format and enforcing username uniqueness across all users
- **FR-022**: System MUST authenticate users via email magic links (passwordless authentication) and distinguish between administrator and participant roles
- **FR-023**: System MUST enforce a 1-hour session timeout with optional "remember me" functionality (7-day extended session) and rate limit magic link requests to 5 per email address per hour to prevent abuse
- **FR-024**: System MUST validate forecast inputs (non-negative integers for scores)
- **FR-025**: System MUST display clear error messages for invalid operations (late forecasts, invalid scores, unauthorized access, duplicate email/username during registration)
- **FR-026**: System MUST store all match date/time information in UTC format and present times to users converted to their local timezone, ensuring consistent start time enforcement across different geographic locations
- **FR-027**: System MUST prevent administrators from deleting tournaments that have active participants or completed matches without explicit confirmation
- **FR-028**: System MUST allow administrators to edit match schedules before the match starts
- **FR-029**: System MUST allow administrators to update match status to postponed or cancelled, preventing forecast submissions and excluding the match from point calculations
- **FR-030**: System MUST allow administrators to reschedule postponed matches by setting a new date/time, which changes the match status back to upcoming and reopens forecast submission
- **FR-031**: System MUST log all administrator actions (tournament creation, score updates, rule changes) for audit purposes
- **FR-032**: System MUST retain all user data, forecasts, match results, and tournament history indefinitely for historical reference and analysis
- **FR-033**: System MUST monitor and track uptime, error rates, forecast submission success rate, point calculation latency, and concurrent user counts
- **FR-034**: System MUST alert administrators when: system downtime exceeds 1 minute, error rate exceeds 5%, or point calculation time exceeds 5 seconds
- **FR-035**: System MUST display an error message immediately when email magic link delivery fails, allowing users to request a new link without automatic retry
- **FR-036**: System MUST automatically identify and exclude matches from scoring when system downtime occurs during the forecast submission window (between tournament start and match start time), notify administrators of affected matches, and provide administrators the option to manually reinstate matches for scoring if deemed appropriate

### Key Entities

- **User**: Represents a person using the system; has a unique username (displayed in tournaments and leaderboards), unique email address (used for magic link authentication and communication), and role (Administrator or Participant); can participate in zero or more tournaments
- **Tournament**: Represents a competition event; has a name, description, start/end dates; has teams, matches, participants, and scoring rules; managed by one or more administrators
- **Team**: Represents a competing entity within a tournament; has a name; participates in multiple matches
- **Match**: Represents a scheduled 1v1 game between two teams; has scheduled date/time (stored in UTC), two teams, optional actual scores, status (upcoming/in-progress/completed/postponed/cancelled); belongs to one tournament
- **Forecast**: Represents a participant's prediction; has predicted scores for both teams, submission timestamp, points earned (not defined until match is scored); linked to one participant, one match
- **ScoringRule**: Represents point calculation logic; has point values for different prediction accuracy levels (exact score, correct winner with close goal difference, correct winner, incorrect); belongs to one tournament; may have version/effective date; default template provides graduated scale (5/3/1/0 points)
- **ParticipantScore**: Represents calculated points for a participant; has total points; linked to one participant, one tournament. Per-match point breakdowns are available via linked forecasts.
- **TournamentParticipant**: Represents the relationship between users and tournaments; indicates which participants have access to which tournaments

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Participants can submit a match forecast in under 30 seconds from viewing the match list.
- **SC-002**: Administrators can create a complete tournament (with 4 teams, 6 matches, and 10 participants) in under 5 minutes.
- **SC-003**: Point calculations are completed within 2 seconds after an administrator enters match results.
- **SC-004**: System supports at least 100 concurrent participants submitting forecasts without performance degradation.
- **SC-005**: 95% of forecast submissions succeed on the first attempt without validation errors.
- **SC-006**: Leaderboard displays updated rankings within 5 seconds of match result entry.
- **SC-007**: 99.99% of concurrent administrator edits to tournament settings complete successfully without data corruption or data loss.
- **SC-008**: Participants can view their complete forecast history and earned points for all matches with 100% accuracy.
- **SC-009**: All forecast submission deadlines are enforced within 1-second accuracy of match start time.
- **SC-010**: All authorization checks are enforced and tested for role-based access control (e.g., participants cannot view other tournaments or enter scores), with 99.99% of unauthorized access attempts prevented in security testing.
