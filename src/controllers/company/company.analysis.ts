import { Request, Response } from "express";
import {
  PrismaClient,
  Role,
  LedgerType,
  GameResult,
  Status,
  GameSession,
} from "@prisma/client";
import { StatusCodes } from "http-status-codes";

const prisma = new PrismaClient();

interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  role?: Role;
  status?: Status;
  gameType?: string;
}

function convertToCSV(data: any): string {
  const rows: string[] = [];

  rows.push("Overview Statistics");
  rows.push("Metric,Value");
  rows.push(`Total Downline,${data.overview.totalDownline}`);
  rows.push(`Active Users,${data.overview.activeUsers}`);
  rows.push(`Total Balance,${data.overview.totalBalance}`);
  rows.push(`Total Bets,${data.overview.totalBets.amount}`);
  rows.push(`Total Wins,${data.overview.totalWins.amount}`);
  rows.push(`Net Revenue,${data.overview.netRevenue}`);
  rows.push("");

  rows.push("Hierarchy Breakdown");
  rows.push("Role,Count,Total Balance,Total Children");
  data.hierarchy.forEach((h: any) => {
    rows.push(`${h.role},${h.count},${h.totalBalance},${h.totalChildren}`);
  });

  return rows.join("\n");
}

export const getDownlineDashboard = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id as string;

    const {
      startDate,
      endDate,
      role,
      status,
      gameType,
      period = "30d",
    } = req.query;

    const filters: DashboardFilters = {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      role: role as Role,
      status: status as Status,
      gameType: gameType as string,
    };

    // set default date range based on period
    if (!filters.startDate && !filters.endDate) {
      filters.endDate = new Date();
      switch (period) {
        case "7d":
          filters.startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          filters.startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90d":
          filters.startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "1y":
          filters.startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          filters.startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      }
    }

    // get user and validate access
    const currentUser = await prisma.company.findUnique({
      where: { id: userId },
      include: { CompanyConfig: true },
    });

    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    //  get all downline users recursively
    const downlineUsers = await getDownlineRecursive(userId as string, filters);
    const downlineIds = downlineUsers.map((u) => u.id);

    // add current user for their own stats
    const allUserIds = [userId, ...downlineIds];

    // date filter for queries
    const dateFilter = {
      ...(filters.startDate && { gte: filters.startDate }),
      ...(filters.endDate && { lte: filters.endDate }),
    };

    const overviewStats = await getOverviewStats(
      allUserIds,
      downlineIds,
      dateFilter
    );

    const hierarchyBreakdown = await getHierarchyBreakdown(userId, filters);

    const financialAnalytics = await getFinancialAnalytics(
      allUserIds,
      downlineIds,
      dateFilter
    );

    const gameAnalytics = await getGameAnalytics(allUserIds, dateFilter);

    const userActivity = await getUserActivityAnalytics(
      downlineIds,
      dateFilter
    );

    const topPerformers = await getTopPerformers(downlineIds, dateFilter);
    const userLoginHistory = await getUserLoginHistory(
      currentUser.role,
      downlineIds,
      dateFilter
    );

    const walletSummary = await getWalletSummary(allUserIds, downlineIds);

    const trends = await getTimeTrends(allUserIds, filters);

    const commissionBreakdown = await getCommissionBreakdown(
      downlineIds,
      dateFilter
    );

    const riskMetrics = await getRiskMetrics(downlineIds, dateFilter);

    const realTimeMetrics = await getRealTimeMetrics(downlineIds);

    const downlineTree = await buildDownlineTree(userId, filters);

    const dashboard = {
      period: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        label: period,
      },
      currentUser: {
        id: currentUser.id,
        username: currentUser.username,
        role: currentUser.role,
        points: currentUser.points,
        status: currentUser.status,
      },
      overview: overviewStats,
      hierarchy: hierarchyBreakdown,
      financial: financialAnalytics,
      games: gameAnalytics,
      activity: userActivity,
      topPerformers,
      wallet: walletSummary,
      trends,
      commissions: commissionBreakdown,
      risk: riskMetrics,
      realTime: realTimeMetrics,
      downlineTree,
      userLoginHistory,
      filters: {
        role: filters.role,
        status: filters.status,
        gameType: filters.gameType,
      },
    };

    return res.status(200).json(dashboard);
  } catch (error) {
    console.error("Dashboard error:", error);
    return res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
};

// Recursively get all downline users
async function getDownlineRecursive(
  userId: string,
  filters: DashboardFilters,
  depth = 0
): Promise<any[]> {
  const whereClause: any = { parentId: userId };

  if (filters.role) whereClause.role = filters.role;
  if (filters.status) whereClause.status = filters.status;

  const directChildren = await prisma.company.findMany({
    where: whereClause,
    include: {
      Wallet: true,
      CompanyConfig: true,
      _count: {
        select: {
          children: true,
          GameSessionsAsPlayer: true,
          Ledger: true,
        },
      },
    },
  });

  let allDownline = [...directChildren];

  for (const child of directChildren) {
    const childDownline = await getDownlineRecursive(
      child.id,
      filters,
      depth + 1
    );
    allDownline = [...allDownline, ...childDownline];
  }

  return allDownline;
}

// Overview statistics
async function getOverviewStats(
  allUserIds: string[],
  downlineIds: string[],
  dateFilter: any
) {
  const [
    totalDownline,
    activeUsers,
    totalBalance,
    totalBets,
    totalWins,
    totalCommissions,
    newUsersCount,
  ] = await Promise.all([
    prisma.company.count({ where: { id: { in: downlineIds } } }),
    prisma.company.count({
      where: { id: { in: downlineIds }, status: Status.ACTIVE },
    }),
    prisma.wallet.aggregate({
      where: { companyId: { in: allUserIds } },
      _sum: { balance: true },
    }),
    prisma.ledger.aggregate({
      where: {
        companyId: { in: allUserIds },
        type: LedgerType.BET,
        createdAt: dateFilter,
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.ledger.aggregate({
      where: {
        companyId: { in: allUserIds },
        type: LedgerType.WIN,
        createdAt: dateFilter,
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.ledger.aggregate({
      where: {
        companyId: { in: downlineIds },
        type: LedgerType.COMMISSION,
        createdAt: dateFilter,
      },
      _sum: { amount: true },
    }),
    prisma.company.count({
      where: {
        id: { in: downlineIds },
        createdAt: dateFilter,
      },
    }),
  ]);

  const netRevenue =
    (totalBets._sum.amount?.toNumber() || 0) -
    (totalWins._sum.amount?.toNumber() || 0);

  return {
    totalDownline,
    activeUsers,
    inactiveUsers: totalDownline - activeUsers,
    totalBalance: totalBalance._sum.balance?.toNumber() || 0,
    totalBets: {
      amount: totalBets._sum.amount?.toNumber() || 0,
      count: totalBets._count,
    },
    totalWins: {
      amount: totalWins._sum.amount?.toNumber() || 0,
      count: totalWins._count,
    },
    netRevenue,
    totalCommissions: totalCommissions._sum.amount?.toNumber() || 0,
    newUsers: newUsersCount,
    houseEdge: totalBets._sum.amount?.toNumber()
      ? ((netRevenue / totalBets._sum.amount.toNumber()) * 100).toFixed(2)
      : 0,
  };
}

// Hierarchy breakdown
async function getHierarchyBreakdown(
  userId: string,
  filters: DashboardFilters
) {
  const breakdown = await prisma.company.groupBy({
    by: ["role"],
    where: {
      parentId: userId,
      ...(filters.status && { status: filters.status }),
    },
    _count: true,
  });

  const detailedBreakdown = await Promise.all(
    breakdown.map(async (item) => {
      const users = await prisma.company.findMany({
        where: {
          parentId: userId,
          role: item.role,
          ...(filters.status && { status: filters.status }),
        },
        include: {
          Wallet: true,
          _count: {
            select: { children: true },
          },
        },
      });

      const totalBalance = users.reduce(
        (sum, u) => sum + (u.Wallet?.balance.toNumber() || 0),
        0
      );
      const totalChildren = users.reduce(
        (sum, u) => sum + u._count.children,
        0
      );

      return {
        role: item.role,
        count: item._count,
        totalBalance,
        totalChildren,
        users: users.map((u) => ({
          id: u.id,
          username: u.username,
          status: u.status,
          balance: u.Wallet?.balance.toNumber() || 0,
          childrenCount: u._count.children,
          createdAt: u.createdAt,
        })),
      };
    })
  );

  return detailedBreakdown;
}

// Financial analytics
async function getFinancialAnalytics(
  allUserIds: string[],
  downlineIds: string[],
  dateFilter: any
) {
  const [ledgerByType, rechargeWithdraw, adjustments] = await Promise.all([
    prisma.ledger.groupBy({
      by: ["type"],
      where: {
        companyId: { in: allUserIds },
        createdAt: dateFilter,
      },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.ledger.findMany({
      where: {
        companyId: { in: downlineIds },
        type: { in: [LedgerType.RECHARGE, LedgerType.WITHDRAW] },
        createdAt: dateFilter,
      },
      include: {
        company: {
          select: { username: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.ledger.findMany({
      where: {
        companyId: { in: downlineIds },
        type: LedgerType.ADJUSTMENT,
        createdAt: dateFilter,
      },
      include: {
        company: {
          select: { username: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const financialSummary = ledgerByType.reduce((acc, item) => {
    acc[item.type] = {
      total: item._sum.amount?.toNumber() || 0,
      count: item._count,
    };
    return acc;
  }, {} as any);

  return {
    summary: financialSummary,
    recentTransactions: rechargeWithdraw.map((t) => ({
      id: t.id,
      username: t.company.username,
      role: t.company.role,
      type: t.type,
      amount: t.amount.toNumber(),
      remark: t.remark,
      createdAt: t.createdAt,
    })),
    adjustments: adjustments.map((a) => ({
      id: a.id,
      username: a.company.username,
      amount: a.amount.toNumber(),
      remark: a.remark,
      createdAt: a.createdAt,
    })),
  };
}

// Game analytics
async function getGameAnalytics(allUserIds: string[], dateFilter: any) {
  const [gamesByType, gamesByResult, recentGames] = await Promise.all([
    prisma.gameSession.groupBy({
      by: ["gameType"],
      where: {
        playerId: { in: allUserIds },
        playedAt: dateFilter,
      },
      _sum: { betAmount: true, winAmount: true },
      _count: true,
    }),
    prisma.gameSession.groupBy({
      by: ["result"],
      where: {
        playerId: { in: allUserIds },
        playedAt: dateFilter,
      },
      _sum: { betAmount: true, winAmount: true },
      _count: true,
    }),
    prisma.gameSession.findMany({
      where: {
        playerId: { in: allUserIds },
        playedAt: dateFilter,
      },
      include: {
        player: {
          select: { username: true, role: true },
        },
        store: {
          select: { username: true },
        },
      },
      orderBy: { playedAt: "desc" },
      take: 100,
    }),
  ]);

  const gameTypeAnalytics = gamesByType.map((g) => ({
    gameType: g.gameType,
    totalGames: g._count,
    totalBets: g._sum.betAmount?.toNumber() || 0,
    totalWins: g._sum.winAmount?.toNumber() || 0,
    netRevenue:
      (g._sum.betAmount?.toNumber() || 0) - (g._sum.winAmount?.toNumber() || 0),
  }));

  const resultAnalytics = gamesByResult.map((r) => ({
    result: r.result,
    count: r._count,
    totalBets: r._sum.betAmount?.toNumber() || 0,
    totalWins: r._sum.winAmount?.toNumber() || 0,
  }));

  return {
    byGameType: gameTypeAnalytics,
    byResult: resultAnalytics,
    recentGames: recentGames.map((g) => ({
      id: g.id,
      gameType: g.gameType,
      player: g.player.username,
      playerRole: g.player.role,
      store: g.store?.username,
      betAmount: g.betAmount.toNumber(),
      winAmount: g.winAmount?.toNumber() || 0,
      result: g.result,
      playedAt: g.playedAt,
    })),
  };
}

// User activity analytics
async function getUserActivityAnalytics(
  downlineIds: string[],
  dateFilter: any
) {
  const [loginActivity, deviceStats, locationStats] = await Promise.all([
    prisma.companyActivity.groupBy({
      by: ["companyId"],
      where: {
        companyId: { in: downlineIds },
        createdAt: dateFilter,
      },
      _count: true,
    }),
    prisma.companyActivity.findMany({
      where: {
        companyId: { in: downlineIds },
        createdAt: dateFilter,
      },
      select: { device: true },
    }),
    prisma.companyActivity.findMany({
      where: {
        companyId: { in: downlineIds },
        createdAt: dateFilter,
      },
      select: { location: true },
    }),
  ]);

  const deviceBreakdown = deviceStats.reduce((acc, activity) => {
    const device = (activity.device as any)?.type || "unknown";
    acc[device] = (acc[device] || 0) + 1;
    return acc;
  }, {} as any);

  const locationBreakdown = locationStats.reduce((acc, activity) => {
    const location = (activity.location as any)?.country || "unknown";
    acc[location] = (acc[location] || 0) + 1;
    return acc;
  }, {} as any);

  return {
    totalActivities: loginActivity.reduce((sum, a) => sum + a._count, 0),
    userActivities: loginActivity.map((a) => ({
      companyId: a.companyId,
      activityCount: a._count,
    })),
    deviceBreakdown,
    locationBreakdown,
  };
}

// Top performers
async function getTopPerformers(downlineIds: string[], dateFilter: any) {
  const [topByBets, topByWins, topByCommissions, mostActiveGaming] =
    await Promise.all([
      prisma.ledger.groupBy({
        by: ["companyId"],
        where: {
          companyId: { in: downlineIds },
          type: LedgerType.BET,
          createdAt: dateFilter,
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 10,
      }),
      prisma.ledger.groupBy({
        by: ["companyId"],
        where: {
          companyId: { in: downlineIds },
          type: LedgerType.WIN,
          createdAt: dateFilter,
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 10,
      }),
      prisma.ledger.groupBy({
        by: ["companyId"],
        where: {
          companyId: { in: downlineIds },
          type: LedgerType.COMMISSION,
          createdAt: dateFilter,
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 10,
      }),
      prisma.gameSession.groupBy({
        by: ["playerId"],
        where: {
          playerId: { in: downlineIds },
          playedAt: dateFilter,
        },
        _count: true,
        orderBy: { _count: { playerId: "desc" } },
        take: 10,
      }),
    ]);

  const enrichUser = async (items: any[], field: string) => {
    return Promise.all(
      items.map(async (item) => {
        const user = await prisma.company.findUnique({
          where: { id: item.companyId || item.playerId },
          select: { username: true, role: true },
        });
        return {
          ...item,
          username: user?.username,
          role: user?.role,
        };
      })
    );
  };

  return {
    topByBets: await enrichUser(topByBets, "companyId"),
    topByWins: await enrichUser(topByWins, "companyId"),
    topByCommissions: await enrichUser(topByCommissions, "companyId"),
    mostActiveGaming: await enrichUser(mostActiveGaming, "playerId"),
  };
}

async function getUserLoginHistory(
  role: Role,
  downlineIds: string[],
  dateFilter: any
) {
  return prisma.companyActivity.findMany({
    where: {
      ...(role !== Role.ADMIN && { companyId: { in: downlineIds } }),
      createdAt: dateFilter,
    },
    select: {
      company: {
        select: {
          username: true,
          role: true,
          email: true,
          contactNumber: true,
          status: true,
          isActive: true,
          createdAt: true,
        },
      },
      createdAt: true,
      location: true,
      device: true,
      ip: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

// Wallet summary
async function getWalletSummary(allUserIds: string[], downlineIds: string[]) {
  const [wallets, lowBalanceUsers, highBalanceUsers] = await Promise.all([
    prisma.wallet.findMany({
      where: { companyId: { in: allUserIds } },
      include: {
        company: {
          select: { username: true, role: true },
        },
      },
    }),
    prisma.wallet.findMany({
      where: {
        companyId: { in: downlineIds },
        balance: { lt: 100 },
      },
      include: {
        company: {
          select: { username: true, role: true, status: true },
        },
      },
      orderBy: { balance: "asc" },
      take: 20,
    }),
    prisma.wallet.findMany({
      where: {
        companyId: { in: downlineIds },
        balance: { gt: 10000 },
      },
      include: {
        company: {
          select: { username: true, role: true },
        },
      },
      orderBy: { balance: "desc" },
      take: 20,
    }),
  ]);

  const totalBalance = wallets.reduce(
    (sum, w) => sum + w.balance.toNumber(),
    0
  );
  const avgBalance = totalBalance / wallets.length || 0;

  return {
    totalBalance,
    avgBalance,
    walletCount: wallets.length,
    lowBalanceUsers: lowBalanceUsers.map((w) => ({
      username: w.company.username,
      role: w.company.role,
      status: w.company.status,
      balance: w.balance.toNumber(),
    })),
    highBalanceUsers: highBalanceUsers.map((w) => ({
      username: w.company.username,
      role: w.company.role,
      balance: w.balance.toNumber(),
    })),
  };
}

// Time-based trends
async function getTimeTrends(allUserIds: string[], filters: DashboardFilters) {
  const startDate =
    filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = filters.endDate || new Date();

  const dailyStats = await prisma.$queryRaw<any[]>`
    SELECT 
      DATE("createdAt") as date,
      COUNT(DISTINCT CASE WHEN type = 'BET' THEN "companyId" END) as active_players,
      COALESCE(SUM(CASE WHEN type = 'BET' THEN amount ELSE 0 END), 0) as total_bets,
      COALESCE(SUM(CASE WHEN type = 'WIN' THEN amount ELSE 0 END), 0) as total_wins,
      COALESCE(SUM(CASE WHEN type = 'COMMISSION' THEN amount ELSE 0 END), 0) as total_commissions,
      COUNT(CASE WHEN type = 'BET' THEN 1 END) as bet_count
    FROM "Ledger"
    WHERE "companyId" IN (${allUserIds.join(",")})
      AND "createdAt" >= ${startDate}
      AND "createdAt" <= ${endDate}
    GROUP BY DATE("createdAt")
    ORDER BY date ASC
  `;

  const hourlyStats = await prisma.$queryRaw<any[]>`
    SELECT 
      DATE_TRUNC('hour', "createdAt") as hour,
      COUNT(*) as transaction_count,
      COALESCE(SUM(CASE WHEN type = 'BET' THEN amount ELSE 0 END), 0) as bets,
      COALESCE(SUM(CASE WHEN type = 'WIN' THEN amount ELSE 0 END), 0) as wins
    FROM "Ledger"
    WHERE "companyId" IN (${allUserIds.join(",")})
      AND "createdAt" >= NOW() - INTERVAL '24 hours'
    GROUP BY DATE_TRUNC('hour', "createdAt")
    ORDER BY hour ASC
  `;

  return {
    daily: dailyStats,
    hourly: hourlyStats,
  };
}

// Commission breakdown
async function getCommissionBreakdown(downlineIds: string[], dateFilter: any) {
  const commissions = await prisma.ledger.findMany({
    where: {
      companyId: { in: downlineIds },
      type: LedgerType.COMMISSION,
      createdAt: dateFilter,
    },
    include: {
      company: {
        select: { username: true, role: true },
      },
    },
  });

  const byRole = commissions.reduce((acc, comm) => {
    const role = comm.company.role;
    if (!acc[role]) {
      acc[role] = { total: 0, count: 0 };
    }
    acc[role].total += comm.amount.toNumber();
    acc[role].count += 1;
    return acc;
  }, {} as any);

  return {
    total: commissions.reduce((sum, c) => sum + c.amount.toNumber(), 0),
    count: commissions.length,
    byRole,
    topEarners: Object.entries(
      commissions.reduce((acc, comm) => {
        const username = comm.company.username;
        acc[username] = (acc[username] || 0) + comm.amount.toNumber();
        return acc;
      }, {} as any)
    )
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 10)
      .map(([username, amount]) => ({ username, amount })),
  };
}

// Risk metrics
async function getRiskMetrics(downlineIds: string[], dateFilter: any) {
  const [suspiciousActivity, highRiskUsers, blockedUsers] = await Promise.all([
    // users with unusual betting patterns
    prisma.gameSession
      .groupBy({
        by: ["playerId"],
        where: {
          playerId: { in: downlineIds },
          playedAt: { gte: dateFilter.gte || new Date(0) },
        },
        _count: { _all: true },
        _avg: { betAmount: true },
        _max: { betAmount: true },
        _sum: { betAmount: true },
      })
      .then(async (results: any) => {
        const suspicious = [];
        for (const result of results) {
          const winCount = await prisma.gameSession.count({
            where: {
              playerId: result.playerId,
              result: "WIN",
              playedAt: { gte: dateFilter.gte || new Date(0) },
            },
          });
          const totalCount = result._count._all;
          const winRate = totalCount > 0 ? winCount / totalCount : 0;
          if (
            totalCount > 50 &&
            (winRate > 0.7 ||
              result._max.betAmount > result._avg.betAmount * 10)
          ) {
            suspicious.push({
              playerId: result.playerId,
              game_count: totalCount,
              avg_bet: result._avg.betAmount,
              max_bet: result._max.betAmount,
              win_rate: winRate,
            });
          }
        }
        return suspicious;
      }),

    // users with multiple accounts (same IP/device)
    prisma.companyActivity.groupBy({
      by: ["ip"],
      where: {
        companyId: { in: downlineIds },
        createdAt: dateFilter,
      },
      _count: { companyId: true },
      having: {
        companyId: {
          _count: { gt: 1 },
        },
      },
    }),

    // blocked users
    prisma.company.findMany({
      where: {
        id: { in: downlineIds },
        status: Status.BLOCK,
      },
      select: {
        id: true,
        username: true,
        role: true,
        updatedAt: true,
      },
    }),
  ]);

  return {
    suspiciousActivity: suspiciousActivity.length,
    multiAccountSuspects: highRiskUsers.length,
    blockedUsers: blockedUsers.length,
    details: {
      suspicious: suspiciousActivity,
      multiAccount: highRiskUsers,
      blocked: blockedUsers,
    },
  };
}

// Real-time metrics
async function getRealTimeMetrics(downlineIds: string[]) {
  const now = new Date();
  const last5Min = new Date(now.getTime() - 5 * 60 * 1000);
  const last1Hour = new Date(now.getTime() - 60 * 60 * 1000);

  const [activeNow, recentGames, recentTransactions, onlineUsers] =
    await Promise.all([
      prisma.gameSession.count({
        where: {
          playerId: { in: downlineIds },
          playedAt: { gte: last5Min },
        },
      }),
      prisma.gameSession.findMany({
        where: {
          playerId: { in: downlineIds },
          playedAt: { gte: last1Hour },
        },
        orderBy: { playedAt: "desc" },
        take: 20,
        include: {
          player: {
            select: { username: true },
          },
        },
      }),
      prisma.ledger.findMany({
        where: {
          companyId: { in: downlineIds },
          createdAt: { gte: last1Hour },
          type: { in: [LedgerType.RECHARGE, LedgerType.WITHDRAW] },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          company: {
            select: { username: true, role: true },
          },
        },
      }),
      prisma.company.count({
        where: {
          id: { in: downlineIds },
          lastLoggedIn: { gte: last5Min },
        },
      }),
    ]);

  return {
    activeGamesLast5Min: activeNow,
    onlineUsers,
    recentGames: recentGames.map((g) => ({
      id: g.id,
      player: g.player.username,
      gameType: g.gameType,
      betAmount: g.betAmount.toNumber(),
      result: g.result,
      playedAt: g.playedAt,
    })),
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id,
      username: t.company.username,
      type: t.type,
      amount: t.amount.toNumber(),
      createdAt: t.createdAt,
    })),
  };
}

// Build downline tree structure
async function buildDownlineTree(
  userId: string,
  filters: DashboardFilters
): Promise<any> {
  const user = await prisma.company.findUnique({
    where: { id: userId },
    include: {
      Wallet: true,
      _count: {
        select: {
          children: true,
          GameSessionsAsPlayer: true,
        },
      },
    },
  });

  if (!user) return null;

  const children = await prisma.company.findMany({
    where: {
      parentId: userId,
      ...(filters.role && { role: filters.role }),
      ...(filters.status && { status: filters.status }),
    },
    include: {
      Wallet: true,
      _count: {
        select: {
          children: true,
          GameSessionsAsPlayer: true,
        },
      },
    },
  });

  const childrenWithTree = await Promise.all(
    children.map((child) => buildDownlineTree(child.id, filters))
  );

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
    balance: user.Wallet?.balance.toNumber() || 0,
    points: user.points,
    childrenCount: user._count.children,
    gamesPlayed: user._count.GameSessionsAsPlayer,
    createdAt: user.createdAt,
    children: childrenWithTree,
  };
}

export const getAdminDashboard = async (req: Request, res: Response) => {
  // admin sees everything
  return getDownlineDashboard(req, res);
};

export const getDistributorDashboard = async (req: Request, res: Response) => {
  // distributor sees their sub-distributors, stores, and players
  return getDownlineDashboard(req, res);
};

export const getSubDistributorDashboard = async (
  req: Request,
  res: Response
) => {
  // Sub-distributor sees their stores and players
  return getDownlineDashboard(req, res);
};

export const getStoreDashboard = async (req: Request, res: Response) => {
  // Store sees their players only
  return getDownlineDashboard(req, res);
};

export const exportDashboardData = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { format = "json" } = req.query;

    const dashboardData = await getDownlineDashboard(req, res);

    if (format === "csv") {
      const csv = convertToCSV(dashboardData);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        "attachment; filename=dashboard-export.csv"
      );
      return res.send(csv);
    }

    if (format === "excel") {
      return res
        .status(501)
        .json({ error: "Excel export not yet implemented" });
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=dashboard-export.json"
    );
    return res.json(dashboardData);
  } catch (error) {
    console.error("Export error:", error);
    return res.status(500).json({ error: "Failed to export dashboard data" });
  }
};

// real-time updates (can be used with WebSocket or polling)
export const getDashboardUpdates = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id as string;
    const { lastUpdate } = req.query;

    const lastUpdateDate = lastUpdate
      ? new Date(lastUpdate as string)
      : new Date(Date.now() - 60000);

    const downlineIds = (await getDownlineRecursive(userId, {})).map(
      (u) => u.id
    );

    const [newGames, newTransactions, statusChanges] = await Promise.all([
      prisma.gameSession.count({
        where: {
          playerId: { in: downlineIds },
          playedAt: { gte: lastUpdateDate },
        },
      }),
      prisma.ledger.count({
        where: {
          companyId: { in: downlineIds },
          createdAt: { gte: lastUpdateDate },
        },
      }),
      prisma.company.count({
        where: {
          id: { in: downlineIds },
          updatedAt: { gte: lastUpdateDate },
        },
      }),
    ]);

    return res.json({
      hasUpdates: newGames > 0 || newTransactions > 0 || statusChanges > 0,
      newGames,
      newTransactions,
      statusChanges,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Updates check error:", error);
    return res.status(500).json({ error: "Failed to check for updates" });
  }
};

// detailed user drill-down
export const getUserDetailedStats = async (req: Request, res: Response) => {
  try {
    const { targetUserId } = req.params;
    const currentUserId = req.user?.id as string;

    // check if the current user has access to the target user
    const downlineIds = (await getDownlineRecursive(currentUserId, {})).map(
      (u) => u.id
    );

    if (!downlineIds.includes(targetUserId) && targetUserId !== currentUserId) {
      return res.status(403).json({ error: "Unauthorized access" });
    }

    const [user, gameSessions, ledgerEntries, activities, wallet] =
      await Promise.all([
        prisma.company.findUnique({
          where: { id: targetUserId },
          include: {
            CompanyConfig: true,
            parent: {
              select: { username: true, role: true },
            },
            _count: {
              select: { children: true },
            },
          },
        }),
        prisma.gameSession.findMany({
          where: { playerId: targetUserId },
          orderBy: { playedAt: "desc" },
          take: 50,
        }),
        prisma.ledger.findMany({
          where: { companyId: targetUserId },
          orderBy: { createdAt: "desc" },
          take: 100,
        }),
        prisma.companyActivity.findMany({
          where: { companyId: targetUserId },
          orderBy: { createdAt: "desc" },
          take: 50,
        }),
        prisma.wallet.findUnique({
          where: { companyId: targetUserId },
        }),
      ]);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate user-specific metrics
    const totalBets = gameSessions.reduce(
      (sum, g) => sum + g.betAmount.toNumber(),
      0
    );
    const totalWins = gameSessions.reduce(
      (sum, g) => sum + (g.winAmount?.toNumber() || 0),
      0
    );
    const winCount = gameSessions.filter(
      (g) => g.result === GameResult.WIN
    ).length;
    const winRate =
      gameSessions.length > 0 ? (winCount / gameSessions.length) * 100 : 0;

    const ledgerSummary = ledgerEntries.reduce((acc, entry) => {
      const type = entry.type;
      if (!acc[type]) {
        acc[type] = { total: 0, count: 0 };
      }
      acc[type].total += entry.amount.toNumber();
      acc[type].count += 1;
      return acc;
    }, {} as any);

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        points: user.points,
        parent: user.parent,
        childrenCount: user._count.children,
        contactNumber: user.contactNumber,
        remarks: user.remarks,
        rechargePerm: user.rechargePerm,
        withdrawPerm: user.withdrawPerm,
        agentProtect: user.agentProtect,
        lastLoggedIn: user.lastLoggedIn,
        createdAt: user.createdAt,
      },
      config: user.CompanyConfig,
      wallet: {
        balance: wallet?.balance.toNumber() || 0,
        updatedAt: wallet?.updatedAt,
      },
      gaming: {
        totalGames: gameSessions.length,
        totalBets,
        totalWins,
        netProfit: totalWins - totalBets,
        winRate: winRate.toFixed(2),
        recentGames: gameSessions.slice(0, 20).map((g) => ({
          id: g.id,
          gameType: g.gameType,
          betAmount: g.betAmount.toNumber(),
          winAmount: g.winAmount?.toNumber() || 0,
          result: g.result,
          playedAt: g.playedAt,
        })),
      },
      financial: {
        ledgerSummary,
        recentTransactions: ledgerEntries.slice(0, 20).map((l) => ({
          id: l.id,
          type: l.type,
          amount: l.amount.toNumber(),
          remark: l.remark,
          createdAt: l.createdAt,
        })),
      },
      activity: {
        totalActivities: activities.length,
        recentActivities: activities.slice(0, 20).map((a) => ({
          id: a.id,
          ip: a.ip,
          device: a.device,
          location: a.location,
          createdAt: a.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("User detail error:", error);
    return res.status(500).json({ error: "Failed to fetch user details" });
  }
};

// comparative analysis
export const getComparativeAnalysis = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id as string;
    const { compareWith } = req.query;

    const currentPeriodStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const currentPeriodEnd = new Date();
    const previousPeriodStart = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const previousPeriodEnd = currentPeriodStart;

    const downlineIds = (await getDownlineRecursive(userId, {})).map(
      (u) => u.id
    );
    const allUserIds = [userId, ...downlineIds];

    const [currentStats, previousStats] = await Promise.all([
      getOverviewStats(allUserIds, downlineIds, {
        gte: currentPeriodStart,
        lte: currentPeriodEnd,
      }),
      getOverviewStats(allUserIds, downlineIds, {
        gte: previousPeriodStart,
        lte: previousPeriodEnd,
      }),
    ]);

    const comparison = {
      totalDownline: {
        current: currentStats.totalDownline,
        previous: previousStats.totalDownline,
        change: currentStats.totalDownline - previousStats.totalDownline,
        changePercent:
          previousStats.totalDownline > 0
            ? (
                ((currentStats.totalDownline - previousStats.totalDownline) /
                  previousStats.totalDownline) *
                100
              ).toFixed(2)
            : 0,
      },
      activeUsers: {
        current: currentStats.activeUsers,
        previous: previousStats.activeUsers,
        change: currentStats.activeUsers - previousStats.activeUsers,
        changePercent:
          previousStats.activeUsers > 0
            ? (
                ((currentStats.activeUsers - previousStats.activeUsers) /
                  previousStats.activeUsers) *
                100
              ).toFixed(2)
            : 0,
      },
      totalBets: {
        current: currentStats.totalBets.amount,
        previous: previousStats.totalBets.amount,
        change: currentStats.totalBets.amount - previousStats.totalBets.amount,
        changePercent:
          previousStats.totalBets.amount > 0
            ? (
                ((currentStats.totalBets.amount -
                  previousStats.totalBets.amount) /
                  previousStats.totalBets.amount) *
                100
              ).toFixed(2)
            : 0,
      },
      netRevenue: {
        current: currentStats.netRevenue,
        previous: previousStats.netRevenue,
        change: currentStats.netRevenue - previousStats.netRevenue,
        changePercent:
          previousStats.netRevenue > 0
            ? (
                ((currentStats.netRevenue - previousStats.netRevenue) /
                  previousStats.netRevenue) *
                100
              ).toFixed(2)
            : 0,
      },
      commissions: {
        current: currentStats.totalCommissions,
        previous: previousStats.totalCommissions,
        change: currentStats.totalCommissions - previousStats.totalCommissions,
        changePercent:
          previousStats.totalCommissions > 0
            ? (
                ((currentStats.totalCommissions -
                  previousStats.totalCommissions) /
                  previousStats.totalCommissions) *
                100
              ).toFixed(2)
            : 0,
      },
    };

    return res.json({
      period: {
        current: { start: currentPeriodStart, end: currentPeriodEnd },
        previous: { start: previousPeriodStart, end: previousPeriodEnd },
      },
      comparison,
      insights: generateInsights(comparison),
    });
  } catch (error) {
    console.error("Comparative analysis error:", error);
    return res
      .status(500)
      .json({ error: "Failed to generate comparative analysis" });
  }
};

// Generate insights from comparison data
function generateInsights(comparison: any): string[] {
  const insights: string[] = [];

  if (parseFloat(comparison.activeUsers.changePercent) > 10) {
    insights.push(
      `Active users increased by ${comparison.activeUsers.changePercent}% - strong growth trend`
    );
  } else if (parseFloat(comparison.activeUsers.changePercent) < -10) {
    insights.push(
      `Active users decreased by ${Math.abs(comparison.activeUsers.changePercent)}% - attention needed`
    );
  }

  if (parseFloat(comparison.netRevenue.changePercent) > 20) {
    insights.push(
      `Revenue surged by ${comparison.netRevenue.changePercent}% - excellent performance`
    );
  } else if (parseFloat(comparison.netRevenue.changePercent) < -20) {
    insights.push(
      `Revenue dropped by ${Math.abs(comparison.netRevenue.changePercent)}% - review required`
    );
  }

  if (parseFloat(comparison.totalBets.changePercent) > 15) {
    insights.push(
      `Betting activity up ${comparison.totalBets.changePercent}% - increased engagement`
    );
  }

  if (insights.length === 0) {
    insights.push("Performance is stable compared to previous period");
  }

  return insights;
}

export const getSalesAnalysis = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Unauthorized" });
    }

    const currentPeriodStart = new Date();
    currentPeriodStart.setMonth(currentPeriodStart.getMonth() - 1);
    const currentPeriodEnd = new Date();

    const previousPeriodStart = new Date();
    previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 2);
    const previousPeriodEnd = new Date();
    previousPeriodEnd.setMonth(previousPeriodEnd.getMonth() - 1);

    const currentStats = (await getSalesStats(
      userId,
      currentPeriodStart,
      currentPeriodEnd
    )) as any[];
    const previousStats = (await getSalesStats(
      userId,
      previousPeriodStart,
      previousPeriodEnd
    )) as any[];

    const comparison = {
      totalSales: {
        current: currentStats.reduce((total, sale) => total + sale.amount, 0),
        previous: previousStats.reduce((total, sale) => total + sale.amount, 0),
        change:
          currentStats.reduce((total, sale) => total + sale.amount, 0) -
          previousStats.reduce((total, sale) => total + sale.amount, 0),
        changePercent:
          previousStats.reduce((total, sale) => total + sale.amount, 0) > 0
            ? (
                ((currentStats.reduce((total, sale) => total + sale.amount, 0) -
                  previousStats.reduce(
                    (total, sale) => total + sale.amount,
                    0
                  )) /
                  previousStats.reduce(
                    (total, sale) => total + sale.amount,
                    0
                  )) *
                100
              ).toFixed(2)
            : 0,
      },
    };

    return res.json({
      period: {
        current: { start: currentPeriodStart, end: currentPeriodEnd },
        previous: { start: previousPeriodStart, end: previousPeriodEnd },
      },
      comparison,
      insights: generateInsights(comparison),
    });
  } catch (error) {
    console.error("Comparative analysis error:", error);
    return res
      .status(500)
      .json({ error: "Failed to generate comparative analysis" });
  }
};

const getSalesStats = async (userId: string, start: Date, end: Date) => {
  try {
    const getSales = await prisma.payment.findMany({
      where: {
        company: {
          parentId: {
            equals: userId,
          },
        },
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        amount: true,
        company: true,
      },
    });

    return getSales;
  } catch (error) {
    return error;
  }
};
