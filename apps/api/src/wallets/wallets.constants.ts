export const DEFAULT_WALLET_CATEGORIES: Array<{
  name: string;
  type: 'income' | 'expense';
}> = [
  // Income categories
  { name: 'Salário', type: 'income' },
  { name: 'Freelance', type: 'income' },
  { name: 'Investimentos', type: 'income' },
  { name: 'Aluguel recebido', type: 'income' },
  { name: 'Presente', type: 'income' },
  { name: 'Outros (receita)', type: 'income' },

  // Expense categories
  { name: 'Alimentação', type: 'expense' },
  { name: 'Moradia', type: 'expense' },
  { name: 'Transporte', type: 'expense' },
  { name: 'Saúde', type: 'expense' },
  { name: 'Educação', type: 'expense' },
  { name: 'Lazer', type: 'expense' },
  { name: 'Vestuário', type: 'expense' },
  { name: 'Serviços & Assinaturas', type: 'expense' },
  { name: 'Viagem', type: 'expense' },
  { name: 'Pets', type: 'expense' },
  { name: 'Eletrônicos', type: 'expense' },
  { name: 'Presentes & Doações', type: 'expense' },
  { name: 'Outros (despesa)', type: 'expense' },
];
