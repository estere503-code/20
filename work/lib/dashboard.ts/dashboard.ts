import { companyResult, salespeople } from '@/lib/calculations';

export type Transaction = {
  id: string;
  reference: string;
  kind: 'sale' | 'expense';
  amount: number;
  description: string;
  customer?: string | null;
  category?: string | null;
  status: string;
  created_at: string;
  project?: { name: string } | null;
  employee?: { name: string } | null;
  proposed_split?: Record<string, number> | null;
  approved_split?: Record<string, number> | null;
  commission_pool?: number | null;
  commission_amounts?: Record<string, number> | null;
  proposed_allocation?: string | null;
  approved_allocation?: string | null;
  notification_status?: string | null;
  notification_error?: string | null;
  sync_status?: string | null;
  sync_error?: string | null;
};

const sum = (items: Transaction[], value: (item: Transaction) => number) =>
  items.reduce((total, item) => total + Number(value(item) || 0), 0);

export function buildDashboard(transactions: Transaction[]) {
  const approvedSales = transactions.filter((tx) => tx.kind === 'sale' && tx.status === 'approved');
  const expenses = transactions.filter((tx) => tx.kind === 'expense');
  const approvedExpenses = expenses.filter((tx) => tx.status === 'approved');
  const recordedExpenses = expenses.filter((tx) => tx.status === 'approved' || tx.status === 'awaiting_allocation');
  const project = (name: string) => {
    const sales = approvedSales.filter((tx) => tx.project?.name === name);
    const allocatedExpenses = approvedExpenses.filter((tx) => tx.approved_allocation === name);
    const income = sum(sales, (tx) => tx.amount);
    const commissions = sum(sales, (tx) => tx.commission_pool ?? 0);
    const allocated = sum(allocatedExpenses, (tx) => tx.amount);
    return { income, commissions, allocated, result: companyResult(income, commissions, allocated) };
  };
  const projectA = project('Project A');
  const projectB = project('Project B');
  const overhead = sum(approvedExpenses.filter((tx) => tx.approved_allocation === 'Company overhead'), (tx) => tx.amount);
  const awaitingAllocation = sum(expenses.filter((tx) => tx.status === 'awaiting_allocation'), (tx) => tx.amount);
  const approvedIncome = sum(approvedSales, (tx) => tx.amount);
  const commissionExpense = sum(approvedSales, (tx) => tx.commission_pool ?? 0);
  const totalExpenses = sum(recordedExpenses, (tx) => tx.amount);
  const earned = Object.fromEntries(salespeople.map((name) => [name, sum(approvedSales, (tx) => Number(tx.commission_amounts?.[name] ?? 0))])) as Record<string, number>;
  return { approvedSales, expenses, approvedExpenses, pendingSales: transactions.filter((tx) => tx.kind === 'sale' && tx.status === 'pending'), awaitingExpenses: expenses.filter((tx) => tx.status === 'awaiting_allocation'), projectA, projectB, overhead, awaitingAllocation, approvedIncome, commissionExpense, totalExpenses, company: companyResult(approvedIncome, commissionExpense, totalExpenses), earned };
                           }
