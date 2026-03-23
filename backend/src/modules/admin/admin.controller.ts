import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Header,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('metrics')
  getMetrics() {
    return this.adminService.getDashboardMetrics();
  }

  @Get('report/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header(
    'Content-Disposition',
    'attachment; filename="reky-reporte-administracion.csv"',
  )
  getCsvReport() {
    return this.adminService.generateCsvReport();
  }

  @Get('transactions/pending')
  getPendingTransactions() {
    return this.adminService.getPendingTransactions();
  }

  @Patch('transactions/:id/verify')
  verifyTransaction(@Param('id') id: string) {
    return this.adminService.verifyTransaction(id);
  }

  @Get('properties/history')
  getPropertyHistory() {
    return this.adminService.getPropertyHistory();
  }

  @Get('properties/pending')
  getPendingProperties() {
    return this.adminService.getPendingProperties();
  }

  @Get('top-agents')
  getTopAgents() {
    return this.adminService.getTopAgents();
  }
}
