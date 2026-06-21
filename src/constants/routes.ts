export const ROUTES = {
  transactions: "/transacciones",
  newTransaction: "/transacciones/nuevo",
  newIncome: "/transacciones/nuevo/ingreso",
  newExpense: "/transacciones/nuevo/gasto",
  newRecurring: "/transacciones/nuevo/recurrente",
  editTransaction: (clientId: string) =>
    `/transacciones/${clientId}/editar`,
  editRecurring: (id: string) => `/transacciones/recurrentes/${id}/editar`,
} as const;
