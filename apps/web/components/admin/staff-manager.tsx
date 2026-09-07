"use client";

import { useState, useTransition } from "react";
import {
  Badge,
  Banner,
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  ModalClose,
  Select,
  Table,
  TableContainer,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  useToast,
} from "@rentora/ui";
import {
  inviteStaffAction,
  setStaffActiveAction,
  updateStaffRoleAction,
  type StaffMember,
} from "@/lib/actions/staff";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  STAFF: "Staff",
  READONLY: "Read only",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  OWNER: "Everything, including billing and removing other owners.",
  MANAGER: "Everything day to day, plus staff and store settings.",
  STAFF: "Bookings, products, and customers.",
  READONLY: "Can look at everything but change nothing.",
};

export function StaffManager({
  staff,
  currentUserId,
  canManage,
  atSeatLimit,
}: {
  staff: StaffMember[];
  currentUserId: string;
  canManage: boolean;
  atSeatLimit: boolean;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  function changeRole(member: StaffMember, role: string) {
    startTransition(async () => {
      const result = await updateStaffRoleAction(member.id, role);
      toast(
        result.error
          ? { title: "Could not change role", description: result.error, tone: "error" }
          : { title: `${member.email} is now ${ROLE_LABELS[role]}` },
      );
    });
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-end gap-3">
        {atSeatLimit ? (
          <p className="font-mono text-[11px] text-warn">You have used every seat on your plan.</p>
        ) : null}
        <Button onClick={() => setInviteOpen(true)} disabled={!canManage || atSeatLimit}>
          Invite someone
        </Button>
      </div>

      <TableContainer>
        <Table>
          <THead>
            <Tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Last seen</Th>
              <Th align="right" />
            </Tr>
          </THead>
          <TBody>
            {staff.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12">
                  <EmptyState
                    title="No staff yet"
                    description="Invite the people who run bookings with you."
                    action={<Button onClick={() => setInviteOpen(true)}>Invite someone</Button>}
                  />
                </td>
              </tr>
            ) : (
              staff.map((member) => (
                <Tr key={member.id}>
                  <Td>
                    <span className="font-medium">{member.name ?? "—"}</span>
                    {member.id === currentUserId ? (
                      <span className="ml-2 font-mono text-[11px] text-paper-faint">
                        (you)
                      </span>
                    ) : null}
                  </Td>
                  <Td muted>{member.email}</Td>
                  <Td>
                    {canManage && member.id !== currentUserId ? (
                      <Select
                        aria-label={`Role for ${member.email}`}
                        value={member.role}
                        disabled={pending}
                        onChange={(e) => changeRole(member, e.target.value)}
                        className="h-8 w-36"
                        options={Object.entries(ROLE_LABELS).map(([value, label]) => ({
                          value,
                          label,
                        }))}
                      />
                    ) : (
                      <Badge tone={member.role === "OWNER" ? "success" : "neutral"}>
                        {ROLE_LABELS[member.role] ?? member.role}
                      </Badge>
                    )}
                  </Td>
                  <Td muted>
                    {member.lastLoginAt
                      ? new Date(member.lastLoginAt).toLocaleDateString()
                      : "Never signed in"}
                  </Td>
                  <Td align="right">
                    {!member.isActive ? (
                      <Badge tone="neutral">Deactivated</Badge>
                    ) : canManage && member.id !== currentUserId ? (
                      <DeactivateStaff member={member} />
                    ) : null}
                  </Td>
                </Tr>
              ))
            )}
          </TBody>
        </Table>
      </TableContainer>

      <div className="mt-5 border border-line bg-ink-raised p-4">
        <p className="text-[13.5px] font-semibold">What each role can do</p>
        <dl className="mt-2 space-y-1.5 text-[13.5px]">
          {Object.entries(ROLE_DESCRIPTIONS).map(([role, description]) => (
            <div key={role} className="flex gap-3">
              <dt className="w-24 shrink-0 font-medium">{ROLE_LABELS[role]}</dt>
              <dd className="text-paper-mute">{description}</dd>
            </div>
          ))}
        </dl>
      </div>

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={(password) => {
          setInviteOpen(false);
          setTemporaryPassword(password);
        }}
      />

      <Modal
        open={temporaryPassword !== null}
        onOpenChange={(open) => {
          if (!open) setTemporaryPassword(null);
        }}
        title="Invitation sent"
        description="If email is not configured yet, pass this one-time password on yourself."
        footer={
          <ModalClose asChild>
            <Button>Done</Button>
          </ModalClose>
        }
      >
        <input
          readOnly
          value={temporaryPassword ?? ""}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full border border-line bg-ink-hover px-3 py-2 font-mono text-[13.5px]"
        />
        <p className="mt-2 font-mono text-[11px] text-paper-faint">
          They should change it after signing in. This is the only time it is shown.
        </p>
      </Modal>
    </>
  );
}

function InviteDialog({
  open,
  onClose,
  onInvited,
}: {
  open: boolean;
  onClose: () => void;
  onInvited: (temporaryPassword: string | null) => void;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("STAFF");
  const [error, setError] = useState<string | null>(null);

  function invite() {
    setError(null);
    startTransition(async () => {
      const result = await inviteStaffAction({ email, name, role });
      if (result.error) {
        setError(result.error);
        return;
      }
      toast({ title: `Invited ${email}` });
      setEmail("");
      setName("");
      onInvited(result.temporaryPassword ?? null);
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Invite a colleague"
      description="They get an email with a link to sign in."
      footer={
        <>
          <ModalClose asChild>
            <Button variant="secondary">Cancel</Button>
          </ModalClose>
          <Button loading={pending} disabled={!email.includes("@")} onClick={invite}>
            Send invitation
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error ? <Banner tone="danger">{error}</Banner> : null}
        <Input
          label="Email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))}
          hint={ROLE_DESCRIPTIONS[role]}
        />
      </div>
    </Modal>
  );
}

function DeactivateStaff({ member }: { member: StaffMember }) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="ghost" className="text-danger">
          Deactivate
        </Button>
      }
      title={`Remove access for ${member.email}?`}
      description="They lose access immediately. Their history stays intact and you can reactivate them later."
      confirmLabel="Remove access"
      destructive
      onConfirm={() =>
        startTransition(async () => {
          const result = await setStaffActiveAction(member.id, false);
          toast(
            result.error
              ? { title: "Could not deactivate", description: result.error, tone: "error" }
              : { title: "Access removed" },
          );
        })
      }
    />
  );
}
