import type { IDashboardRepository } from "@/repositories/dashboard.repository";

export class GetDashboardStatsUseCase {
  constructor(private readonly repo: IDashboardRepository) {}

  async execute(workspaceId: string) {
    const [stats, leadsByDay, contactsByState, recentContacts] = await Promise.all([
      this.repo.getStats(workspaceId),
      this.repo.getLeadsByDay(workspaceId, 30),
      this.repo.getContactsByState(workspaceId),
      this.repo.getRecentContacts(workspaceId, 5),
    ]);

    return { stats, leadsByDay, contactsByState, recentContacts };
  }
}
