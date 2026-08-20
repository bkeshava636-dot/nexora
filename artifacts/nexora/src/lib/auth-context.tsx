import { createContext, useContext, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCurrentAdmin,
  useLogin,
  useLogout,
  type LoginInput,
} from "@workspace/api-client-react";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  username?: string;
  login: (credentials: LoginInput) => Promise<void>;
  loginError: string | null;
  isLoggingIn: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // Backend enforcement (requireAdmin) is what actually protects admin
  // routes — this query only drives what the UI shows, and is re-checked on
  // every mount so a session that expired server-side is reflected here too.
  const me = useGetCurrentAdmin();
  const loginMutation = useLogin();
  const logoutMutation = useLogout();

  const value: AuthContextValue = {
    isAuthenticated: me.data?.authenticated ?? false,
    isLoading: me.isLoading,
    username: me.data?.authenticated ? me.data.username : undefined,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error ? "Incorrect username or password." : null,
    async login(credentials) {
      const res = await loginMutation.mutateAsync({ data: credentials });
      queryClient.setQueryData(me.queryKey, res);
      await queryClient.refetchQueries({ queryKey: me.queryKey });
    },
    logout() {
      logoutMutation.mutate(undefined, {
        onSettled: () => {
          queryClient.setQueryData(me.queryKey, { authenticated: false });
          void queryClient.invalidateQueries({ queryKey: me.queryKey });
        },
      });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
