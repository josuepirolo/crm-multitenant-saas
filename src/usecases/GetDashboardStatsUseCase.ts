import type { IDashboardRepository } from "@/repositories/dashboard.repository";

export class GetDashboardStatsUseCase {
  constructor(private readonly repo: IDashboardRepository) {}

  async execute(workspaceId: string) {
    const [stats, leadsByDay, dealsByStatus, recentContacts] = await Promise.all([
      this.repo.getStats(workspaceId),
      this.repo.getLeadsByDay(workspaceId, 30),
      this.repo.getDealsByStatus(workspaceId),
      this.repo.getRecentContacts(workspaceId, 5),
    ]);

    const conversionRate = stats.totalDealsCount > 0
      ? Math.round((stats.wonDealsCount / stats.totalDealsCount) * 100)
      : 0;

    return { stats, leadsByDay, dealsByStatus, recentContacts, conversionRate };
  }
}
