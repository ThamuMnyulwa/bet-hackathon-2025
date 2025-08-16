import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  recipientName: string;
  recipientAccount: string;
  status: string;
  riskScore?: number;
  authMethod?: string;
  stepUpRequired: boolean;
  escrowReleaseTime?: string;
  createdAt: string;
  updatedAt: string;
  timeAgo: string;
}

interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  hasMore: boolean;
}

interface StatusUpdateRequest {
  transactionId: string;
  status: string;
}

// Query keys for better cache management
export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters: { limit?: number; offset?: number; status?: string }) => 
    [...transactionKeys.lists(), filters] as const,
  details: () => [...transactionKeys.all, 'detail'] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
};

// Fetch transactions hook
export function useTransactions(filters: { limit?: number; offset?: number; status?: string } = {}) {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: async (): Promise<TransactionsResponse> => {
      const params = new URLSearchParams();
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/payments/transactions?${params.toString()}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to view transactions');
        }
        throw new Error('Failed to fetch transactions');
      }

      return response.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes for transactions
  });
}

// Update transaction status hook with targeted cache invalidation
export function useUpdateTransactionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactionId, status }: StatusUpdateRequest): Promise<{ success: boolean; transactionId: string; status: string }> => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/payments/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ transactionId, status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update transaction status');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate only the specific transaction lists that might contain this transaction
      // This ensures we don't invalidate unrelated queries
      queryClient.invalidateQueries({
        queryKey: transactionKeys.lists(),
        exact: false,
      });

      // Optimistically update the specific transaction in all cached lists
      queryClient.setQueriesData(
        { queryKey: transactionKeys.lists(), exact: false },
        (oldData: TransactionsResponse | undefined) => {
          if (!oldData?.transactions) return oldData;

          return {
            ...oldData,
            transactions: oldData.transactions.map(tx =>
              tx.id === data.transactionId
                ? { ...tx, status: data.status, updatedAt: new Date().toISOString() }
                : tx
            ),
          };
        }
      );

      toast.success(`Transaction ${data.status.toLowerCase()}`);
    },
    onError: (error) => {
      console.error('Failed to update transaction status:', error);
      toast.error('Failed to update transaction status');
    },
  });
}

// Fetch single transaction hook
export function useTransaction(id: string) {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: async (): Promise<Transaction> => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/payments/transactions/${id}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch transaction');
      }

      return response.json();
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes for individual transactions
  });
}

// Refresh transactions hook
export function useRefreshTransactions() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({
      queryKey: transactionKeys.lists(),
      exact: false,
    });
  };
}
