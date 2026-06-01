import type { Database } from '../../db/client.js';
import { ApplicationsRepository } from '../applications/applications.repository.js';
import { ApplicationsService } from '../applications/applications.service.js';
import { DashboardRepository } from '../dashboard/dashboard.repository.js';
import { DashboardService } from '../dashboard/dashboard.service.js';
import { InterviewsRepository } from '../interviews/interviews.repository.js';
import { InterviewsService } from '../interviews/interviews.service.js';
import { ContactsRepository } from '../contacts/contacts.repository.js';
import { ContactsService } from '../contacts/contacts.service.js';
import { FollowUpsRepository } from '../follow-ups/follow-ups.repository.js';
import { FollowUpsService } from '../follow-ups/follow-ups.service.js';
import { ActivitiesRepository } from '../activities/activities.repository.js';
import { ActivitiesService } from '../activities/activities.service.js';

export interface AssistantDeps {
  applications: ApplicationsService;
  dashboard: DashboardService;
  interviews: InterviewsService;
  contacts: ContactsService;
  followUps: FollowUpsService;
  activities: ActivitiesService;
}

export function buildAssistantDeps(db: Database): AssistantDeps {
  return {
    applications: new ApplicationsService(new ApplicationsRepository(db)),
    dashboard: new DashboardService(new DashboardRepository(db)),
    interviews: new InterviewsService(db, new InterviewsRepository(db)),
    contacts: new ContactsService(db, new ContactsRepository(db)),
    followUps: new FollowUpsService(db, new FollowUpsRepository(db)),
    activities: new ActivitiesService(db, new ActivitiesRepository(db)),
  };
}
