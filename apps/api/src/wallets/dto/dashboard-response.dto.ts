import { ApiProperty } from '@nestjs/swagger';

export class DashboardFlowDto {
  @ApiProperty({ description: 'Total income in the period', example: 5000 })
  income!: number;

  @ApiProperty({ description: 'Total expenses in the period (positive value)', example: 2500 })
  expenses!: number;

  @ApiProperty({ description: 'Net = income - expenses', example: 2500 })
  net!: number;
}

export class DashboardPeriodSummaryDto {
  @ApiProperty({ type: DashboardFlowDto, description: 'Realized cash flow — status=paid, aggregated by paidAt' })
  confirmed!: DashboardFlowDto;

  @ApiProperty({ type: DashboardFlowDto, description: 'Expected cash flow — status!=canceled, aggregated by dueDate' })
  projected!: DashboardFlowDto;
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

  @ApiProperty({ description: 'Total expenses (projected) for this category in the period', example: 450 })
  totalExpenses!: number;

  @ApiProperty({ example: 5 })
  transactionCount!: number;
}

export class DashboardMonthlyTrendItemDto {
  @ApiProperty({ example: 4 })
  month!: number;

  @ApiProperty({ example: 2026 })
  year!: number;

  @ApiProperty({ type: DashboardFlowDto })
  confirmed!: DashboardFlowDto;

  @ApiProperty({ type: DashboardFlowDto })
  projected!: DashboardFlowDto;
}

export class DashboardCreditCardSummaryDto {
  @ApiProperty({
    description:
      'Sum of credit_card_purchase transactions with dueDate in the summary month (status != canceled). Useful to surface card spending that is still a commitment, not yet a cash outflow.',
    example: 12345,
  })
  monthSpendCents!: number;

  @ApiProperty({ description: 'Number of credit card purchase rows in the summary month' })
  monthTransactionCount!: number;
}

export class DashboardResponseDto {
  @ApiProperty({ type: DashboardMonthSummaryDto })
  currentMonth!: DashboardMonthSummaryDto;

  @ApiProperty({ type: DashboardYearSummaryDto })
  currentYear!: DashboardYearSummaryDto;

  @ApiProperty({ type: [DashboardCategoryBreakdownItemDto] })
  categoryBreakdown!: DashboardCategoryBreakdownItemDto[];

  @ApiProperty({ type: [DashboardMonthlyTrendItemDto], description: 'Months in the requested range, ordered oldest to newest' })
  monthlyTrend!: DashboardMonthlyTrendItemDto[];

  @ApiProperty({ type: DashboardCreditCardSummaryDto })
  creditCard!: DashboardCreditCardSummaryDto;
}
