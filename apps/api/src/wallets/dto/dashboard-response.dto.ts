import { ApiProperty } from '@nestjs/swagger';

export class DashboardPeriodSummaryDto {
  @ApiProperty({ description: 'Total income (paid transactions) in the period', example: 5000 })
  income!: number;

  @ApiProperty({ description: 'Total expenses (paid transactions, positive value) in the period', example: 2500 })
  expenses!: number;

  @ApiProperty({ description: 'Net = income - expenses', example: 2500 })
  net!: number;
}

export class DashboardMonthSummaryDto extends DashboardPeriodSummaryDto {
  @ApiProperty({ example: 4, description: 'Month number (1–12)' })
  month!: number;

  @ApiProperty({ example: 2026 })
  year!: number;
}

export class DashboardYearSummaryDto extends DashboardPeriodSummaryDto {
  @ApiProperty({ example: 2026 })
  year!: number;
}

export class DashboardCategoryBreakdownItemDto {
  @ApiProperty({ nullable: true })
  categoryId!: string | null;

  @ApiProperty({ nullable: true })
  categoryName!: string | null;

  @ApiProperty({ description: 'Total expenses for this category in the current month', example: 450 })
  totalExpenses!: number;

  @ApiProperty({ example: 5 })
  transactionCount!: number;
}

export class DashboardMonthlyTrendItemDto {
  @ApiProperty({ example: 4 })
  month!: number;

  @ApiProperty({ example: 2026 })
  year!: number;

  @ApiProperty({ description: 'Total paid income in this month', example: 5000 })
  income!: number;

  @ApiProperty({ description: 'Total paid expenses in this month (positive value)', example: 2500 })
  expenses!: number;
}

export class DashboardResponseDto {
  @ApiProperty({ type: DashboardMonthSummaryDto })
  currentMonth!: DashboardMonthSummaryDto;

  @ApiProperty({ type: DashboardYearSummaryDto })
  currentYear!: DashboardYearSummaryDto;

  @ApiProperty({ type: [DashboardCategoryBreakdownItemDto] })
  categoryBreakdown!: DashboardCategoryBreakdownItemDto[];

  @ApiProperty({ type: [DashboardMonthlyTrendItemDto], description: 'Last 12 months ending with previous month, ordered oldest to newest' })
  monthlyTrend!: DashboardMonthlyTrendItemDto[];
}
