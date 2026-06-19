"use client";

import { useRef } from "react";
import { AccountForm } from "@/components/accounts/account-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Account, AccountType } from "@/types/database";

type AccountCreateInput = {
  name: string;
  description?: string;
  type: AccountType;
  icon?: string;
  color?: string;
  currency_code?: string;
};

interface AccountCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: AccountCreateInput) => Promise<Account>;
  onCreated: (account: Account) => void;
}

export function AccountCreateDialog({
  open,
  onOpenChange,
  onCreate,
  onCreated,
}: AccountCreateDialogProps) {
  const createdRef = useRef<Account | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva cuenta</DialogTitle>
        </DialogHeader>
        {open && (
          <AccountForm
            mode="create"
            variant="embedded"
            onSubmit={async (data) => {
              createdRef.current = await onCreate(data);
            }}
            onSuccess={() => {
              if (createdRef.current) {
                onCreated(createdRef.current);
                createdRef.current = null;
              }
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
