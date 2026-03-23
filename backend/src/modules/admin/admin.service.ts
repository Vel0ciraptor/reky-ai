import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/database/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) { }

  async getDashboardMetrics() {
    const now = new Date();

    // Date boundaries
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalAgents,
      totalProperties,
      totalTransactions,
      pendingVerifications,
      totalAgencies,
      salesWeek,
      salesMonth,
      salesYear,
      propsWeek,
      propsMonth,
      propsYear,
      agentsThisMonth,
      recentTransactions,
    ] = await Promise.all([
      this.prisma.agent.count({ where: { role: { not: 'admin' } } }),
      this.prisma.property.count(),
      this.prisma.transaction.count({ where: { verificado: true } }),
      this.prisma.transaction.count({ where: { verificado: false } }),
      this.prisma.agency.count(),
      // Sales by period (verified)
      this.prisma.transaction.count({
        where: { verificado: true, fecha: { gte: startOfWeek } },
      }),
      this.prisma.transaction.count({
        where: { verificado: true, fecha: { gte: startOfMonth } },
      }),
      this.prisma.transaction.count({
        where: { verificado: true, fecha: { gte: startOfYear } },
      }),
      // Properties by period
      this.prisma.property.count({
        where: { createdAt: { gte: startOfWeek } },
      }),
      this.prisma.property.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      this.prisma.property.count({
        where: { createdAt: { gte: startOfYear } },
      }),
      // Agents joined this month
      this.prisma.agent.count({
        where: { createdAt: { gte: startOfMonth }, role: { not: 'admin' } },
      }),
      // Latest 12 months of verified transactions for chart
      this.prisma.transaction.findMany({
        where: {
          verificado: true,
          fecha: { gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) },
        },
        select: { fecha: true, tipo: true },
        orderBy: { fecha: 'asc' },
      }),
    ]);

    // Build monthly chart data (last 12 months)
    const monthlyChart: {
      label: string;
      ventas: number;
      propiedades: number;
    }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const label = d.toLocaleDateString('es-BO', { month: 'short' });
      const ventas = recentTransactions.filter(
        (t) => t.fecha >= d && t.fecha < nextMonth,
      ).length;
      const propsInMonth = await this.prisma.property.count({
        where: { createdAt: { gte: d, lt: nextMonth } },
      });
      monthlyChart.push({ label, ventas, propiedades: propsInMonth });
    }

    // Build daily chart data (last 28 days)
    const allRecentTxs = await this.prisma.transaction.findMany({
      where: {
        verificado: true,
        fecha: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 28),
        },
      },
      select: { fecha: true },
    });
    const dailyChart: { label: string; ventas: number; propiedades: number }[] =
      [];
    for (let i = 27; i >= 0; i--) {
      const dayStart = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - i,
        0,
        0,
        0,
      );
      const dayEnd = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - i + 1,
        0,
        0,
        0,
      );
      const label = dayStart.toLocaleDateString('es-BO', {
        day: '2-digit',
        month: 'short',
      });
      const ventas = allRecentTxs.filter(
        (t) => t.fecha >= dayStart && t.fecha < dayEnd,
      ).length;
      const propsInDay = await this.prisma.property.count({
        where: { createdAt: { gte: dayStart, lt: dayEnd } },
      });
      dailyChart.push({ label, ventas, propiedades: propsInDay });
    }

    // Build weekly chart data (last 12 weeks)
    const twelveWeeksAgo = new Date(now);
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);
    const allWeeklyTxs = await this.prisma.transaction.findMany({
      where: { verificado: true, fecha: { gte: twelveWeeksAgo } },
      select: { fecha: true },
    });
    const weeklyChart: {
      label: string;
      ventas: number;
      propiedades: number;
    }[] = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7 + now.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const label = `${weekStart.toLocaleDateString('es-BO', { day: '2-digit', month: 'short' })}`;
      const ventas = allWeeklyTxs.filter(
        (t) => t.fecha >= weekStart && t.fecha < weekEnd,
      ).length;
      const propsInWeek = await this.prisma.property.count({
        where: { createdAt: { gte: weekStart, lt: weekEnd } },
      });
      weeklyChart.push({ label, ventas, propiedades: propsInWeek });
    }

    // Property type distribution
    const [ventaCount, alquilerCount, anticreticoCount] = await Promise.all([
      this.prisma.property.count({ where: { tipo: 'venta' } }),
      this.prisma.property.count({ where: { tipo: 'alquiler' } }),
      this.prisma.property.count({ where: { tipo: 'anticretico' } }),
    ]);

    return {
      totalAgents,
      totalProperties,
      totalTransactions,
      pendingVerifications,
      totalAgencies,
      salesWeek,
      salesMonth,
      salesYear,
      propsWeek,
      propsMonth,
      propsYear,
      agentsThisMonth,
      dailyChart,
      weeklyChart,
      monthlyChart,
      propertyDistribution: {
        venta: ventaCount,
        alquiler: alquilerCount,
        anticretico: anticreticoCount,
      },
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
            matricula: true,
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
      'MATRICULA',
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
      const matricula = tx.property?.matricula ?? 'S/N';
      // Escaping quotes for CSV safely
      const location = `"${(tx.property?.ubicacion ?? 'Sin Ubicación').replace(/"/g, '""')}"`;
      const agentName = `"${tx.agent?.name} ${tx.agent?.lastName}"`;
      const agencyName = `"${tx.agent?.agency?.name ?? 'Independiente'}"`;

      addRow([
        date,
        type,
        status,
        price,
        matricula,
        location,
        agentName,
        agencyName,
      ]);
    }

    // Add UTF-8 BOM and join with semicolon
    return '\uFEFF' + rows.map((r) => r.join(';')).join('\r\n');
  }
}
