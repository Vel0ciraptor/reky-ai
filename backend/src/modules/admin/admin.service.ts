import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) { }

  async getDashboardMetrics() {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    const twentyEightDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 27);
    const twelveWeeksAgo = new Date(now);
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

    // All scalar counts + bulk data in ONE Promise.all — no N+1 loops
    const [
      totalAgents, totalProperties, totalTransactions, pendingVerifications,
      totalAgencies, salesWeek, salesMonth, salesYear,
      propsWeek, propsMonth, propsYear, agentsThisMonth,
      ventaCount, alquilerCount, anticreticoCount,
      allVerifiedTx, allProperties, totalImages,
      totalMessages, totalRequirements,
      totalCoVenta, totalWalletBalance,
    ] = await Promise.all([
      this.prisma.agent.count({ where: { role: { not: 'admin' } } }),
      this.prisma.property.count(),
      this.prisma.transaction.count({ where: { verificado: true } }),
      this.prisma.transaction.count({ where: { verificado: false } }),
      this.prisma.agency.count(),
      this.prisma.transaction.count({ where: { verificado: true, fecha: { gte: startOfWeek } } }),
      this.prisma.transaction.count({ where: { verificado: true, fecha: { gte: startOfMonth } } }),
      this.prisma.transaction.count({ where: { verificado: true, fecha: { gte: startOfYear } } }),
      this.prisma.property.count({ where: { createdAt: { gte: startOfWeek } } }),
      this.prisma.property.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.property.count({ where: { createdAt: { gte: startOfYear } } }),
      this.prisma.agent.count({ where: { createdAt: { gte: startOfMonth }, role: { not: 'admin' } } }),
      this.prisma.property.count({ where: { tipo: 'venta' } }),
      this.prisma.property.count({ where: { tipo: 'alquiler' } }),
      this.prisma.property.count({ where: { tipo: 'anticretico' } }),
      // Bulk fetch once — slice in JS for daily/weekly/monthly charts
      this.prisma.transaction.findMany({
        where: { verificado: true, fecha: { gte: twelveMonthsAgo } },
        include: { property: { select: { createdAt: true } } },
      }),
      this.prisma.property.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true },
      }),
      this.prisma.propertyImage.count(),
      this.prisma.message.count(),
      this.prisma.requerimiento.count(),
      this.prisma.propertyAgent.count({ where: { enCoventa: true } }),
      this.prisma.wallet.aggregate({ _sum: { balance: true } }),
    ]);

    // Calculate Average Time to Close (verified tx only)
    let avgDaysToClose = 0;
    const closedWithCreationDates = allVerifiedTx.filter(t => t.property?.createdAt);
    if (closedWithCreationDates.length > 0) {
      const totalDays = closedWithCreationDates.reduce((acc, t) => {
        const diff = t.fecha.getTime() - t.property!.createdAt.getTime();
        return acc + (diff / (1000 * 60 * 60 * 24));
      }, 0);
      avgDaysToClose = totalDays / closedWithCreationDates.length;
    }

    // Also fetch messages for the chart if we want interaction trend
    const allMessages = await this.prisma.message.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true },
    });

    const allImages = await this.prisma.propertyImage.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true },
    });

    // Monthly chart (12 months) — pure JS, zero extra DB calls
    const monthlyChart = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      return {
        label: d.toLocaleDateString('es-BO', { month: 'short' }),
        ventas: allVerifiedTx.filter((t) => t.fecha >= d && t.fecha < next).length,
        propiedades: allProperties.filter((p) => p.createdAt >= d && p.createdAt < next).length,
        mensajes: allMessages.filter((m) => m.createdAt >= d && m.createdAt < next).length,
        imagenes: allImages.filter((img) => img.createdAt >= d && img.createdAt < next).length,
      };
    });

    // Daily chart (last 28 days)
    const dailyChart = Array.from({ length: 28 }, (_, i) => {
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (27 - i), 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      return {
        label: dayStart.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }),
        ventas: allVerifiedTx.filter((t) => t.fecha >= twentyEightDaysAgo && t.fecha >= dayStart && t.fecha < dayEnd).length,
        propiedades: allProperties.filter((p) => p.createdAt >= twentyEightDaysAgo && p.createdAt >= dayStart && p.createdAt < dayEnd).length,
      };
    });

    // Weekly chart (last 12 weeks)
    const weeklyChart = Array.from({ length: 12 }, (_, i) => {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - ((11 - i) * 7 + now.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      return {
        label: weekStart.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' }),
        ventas: allVerifiedTx.filter((t) => t.fecha >= twelveWeeksAgo && t.fecha >= weekStart && t.fecha < weekEnd).length,
        propiedades: allProperties.filter((p) => p.createdAt >= twelveWeeksAgo && p.createdAt >= weekStart && p.createdAt < weekEnd).length,
      };
    });

    return {
      totalAgents, totalProperties, totalTransactions, pendingVerifications,
      totalAgencies, salesWeek, salesMonth, salesYear,
      propsWeek, propsMonth, propsYear, agentsThisMonth,
      dailyChart, weeklyChart, monthlyChart,
      propertyDistribution: { venta: ventaCount, alquiler: alquilerCount, anticretico: anticreticoCount },
      resourceUsage: {
          totalImages,
          totalMessages,
          totalRequirements,
          estimatedR2UsageMB: totalImages * 0.45, // 450KB per WebP image estimate
          supabaseRowsEst: totalAgents + totalProperties + totalTransactions + totalMessages + totalRequirements,
      },
      businessMetrics: {
          totalCoVenta,
          totalWalletBalance: Number(totalWalletBalance._sum.balance || 0),
          avgDaysToClose: Number(avgDaysToClose.toFixed(1)),
          conversionRate: totalProperties > 0 ? Number(((totalTransactions / totalProperties) * 100).toFixed(2)) : 0,
      }
    };
  }

  async getPendingTransactions() {
    return this.prisma.transaction.findMany({
      where: { verificado: false },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        property: {
          select: {
            id: true,
            ubicacion: true,
            tipo: true,
            precio: true,
            images: { take: 1, select: { url: true } },
          },
        },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  async verifyTransaction(id: string) {
    const tx = await this.prisma.transaction.update({
      where: { id },
      data: { verificado: true },
    });

    // Award points to agent upon admin verification
    const pointsMap: Record<string, number> = {
      venta: 50,
      alquiler: 20,
      anticretico: 30,
    };
    const pts = pointsMap[tx.tipo] ?? 10;
    await this.prisma.agent.update({
      where: { id: tx.agentId },
      data: { points: { increment: pts } },
    });

    return tx;
  }

  async getPropertyHistory() {
    return this.prisma.property.findMany({
      include: {
        agents: {
          include: {
            agent: { select: { id: true, name: true, lastName: true } },
          },
        },
        transactions: {
          include: { agent: { select: { id: true, name: true } } },
          orderBy: { fecha: 'desc' },
        },
        images: { take: 1, select: { url: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async getPendingProperties() {
    // Properties recently uploaded (last 7 days) that have no verified transactions yet
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 30);

    return this.prisma.property.findMany({
      where: { createdAt: { gte: oneWeekAgo } },
      include: {
        agents: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                lastName: true,
                email: true,
                avatarUrl: true,
                agencyId: true,
                agency: { select: { name: true } },
              },
            },
          },
        },
        images: { take: 1, select: { url: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getTopAgents() {
    return this.prisma.agent.findMany({
      where: { role: { not: 'admin' } },
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        avatarUrl: true,
        points: true,
        verified: true,
        agency: { select: { name: true } },
        _count: { select: { properties: { where: { enCoventa: false } }, transactions: true } },
      },
      orderBy: { points: 'desc' },
      take: 20,
    });
  }

  async generateCsvReport(): Promise<string> {
    // Fetch detailed transactions
    const transactions = await this.prisma.transaction.findMany({
      include: {
        property: true,
        agent: { include: { agency: true } },
      },
      orderBy: { fecha: 'desc' },
    });

    const metrics = await this.getDashboardMetrics();

    const rows: any[][] = [];
    const addRow = (row: any[]) => rows.push(row);
    const addEmpty = () => rows.push([]);

    addRow(['Reporte Detallado de Administración - Reky AI']);
    addRow(['Fecha de generación:', new Date().toLocaleDateString('es-BO')]);
    addEmpty();

    addRow(['1. METRICAS GENERALES', 'VALOR']);
    addRow(['Total Agentes', metrics.totalAgents]);
    addRow(['Total Agencias', metrics.totalAgencies]);
    addRow(['Total Propiedades', metrics.totalProperties]);
    addRow(['Ventas Verificadas', metrics.totalTransactions]);
    addRow(['Transacciones Pendientes', metrics.pendingVerifications]);
    addRow(['Nuevos Agentes (Mes)', metrics.agentsThisMonth]);
    addEmpty();

    addRow(['2. VENTAS POR PERIODO', 'VENTAS', 'PROPIEDADES NUEVAS']);
    addRow(['Semana Actual', metrics.salesWeek, metrics.propsWeek]);
    addRow(['Mes Actual', metrics.salesMonth, metrics.propsMonth]);
    addRow(['Año Actual', metrics.salesYear, metrics.propsYear]);
    addEmpty();

    addRow(['3. DISTRIBUCIÓN DE PROPIEDADES', 'CANTIDAD']);
    addRow(['Venta', metrics.propertyDistribution.venta]);
    addRow(['Alquiler', metrics.propertyDistribution.alquiler]);
    addRow(['Anticrético', metrics.propertyDistribution.anticretico]);
    addEmpty();

    addRow(['4. DETALLE DE TODAS LAS TRANSACCIONES / VENTAS']);
    addRow([
      'FECHA',
      'TIPO OPERACION',
      'ESTADO',
      'PRECIO (USD)',
      'UBICACION/PROPIEDAD',
      'AGENTE',
      'AGENCIA',
    ]);

    for (const tx of transactions) {
      const date = new Date(tx.fecha).toLocaleDateString('es-BO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const type = tx.tipo.toUpperCase();
      const status = tx.verificado ? 'Verificado' : 'Pendiente';
      const price = Number(tx.property?.precio ?? 0).toFixed(2);
      // Escaping quotes for CSV safely
      const location = `"${(tx.property?.ubicacion ?? 'Sin Ubicación').replace(/"/g, '""')}"`;
      const agentName = `"${tx.agent?.name} ${tx.agent?.lastName}"`;
      const agencyName = `"${tx.agent?.agency?.name ?? 'Independiente'}"`;

      addRow([
        date,
        type,
        status,
        price,
        location,
        agentName,
        agencyName,
      ]);
    }

    // Add UTF-8 BOM and join with semicolon
    return '\uFEFF' + rows.map((r) => r.join(';')).join('\r\n');
  }
}
