"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  ModalClose,
  useToast,
} from "@rentora/ui";
import {
  deleteLocationAction,
  saveLocationAction,
  type Location,
} from "@/lib/actions/operations";

export function LocationsManager({ locations }: { locations: Location[] }) {
  const [editing, setEditing] = useState<Location | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)}>Add location</Button>
      </div>

      {locations.length === 0 ? (
        <Card>
          <EmptyState
            title="No locations yet"
            description="Add the warehouse or shop customers collect from. Delivery distances are measured from your main location."
            action={<Button onClick={() => setCreating(true)}>Add your first location</Button>}
          />
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {locations.map((location) => (
            <li key={location.id}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold">{location.name}</p>
                    <address className="mt-1 not-italic text-sm text-[var(--color-muted-foreground)]">
                      {location.address}
                      <br />
                      {location.zipCode} {location.city}, {location.country}
                    </address>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {location.isPrimary ? <Badge tone="success">Main</Badge> : null}
                    {!location.isActive ? <Badge tone="neutral">Hidden</Badge> : null}
                  </div>
                </div>

                <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
                  {location.latitude && location.longitude
                    ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                    : "No coordinates — delivery cannot be quoted from here"}
                </p>

                <div className="mt-3 flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => setEditing(location)}>
                    Edit
                  </Button>
                  {!location.isPrimary ? <DeleteLocation location={location} /> : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <LocationDialog
        key={editing?.id ?? "new"}
        open={creating || editing !== null}
        location={editing}
        isFirst={locations.length === 0}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </>
  );
}

function DeleteLocation({ location }: { location: Location }) {
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  return (
    <ConfirmDialog
      trigger={
        <Button size="sm" variant="ghost" className="text-red-600">
          Delete
        </Button>
      }
      title={`Delete ${location.name}?`}
      description="Existing bookings keep the address they were given."
      confirmLabel="Delete location"
      destructive
      onConfirm={() =>
        startTransition(async () => {
          const result = await deleteLocationAction(location.id);
          toast(
            result.error
              ? { title: "Could not delete", description: result.error, tone: "error" }
              : { title: "Location deleted" },
          );
        })
      }
    />
  );
}

function LocationDialog({
  open,
  location,
  isFirst,
  onClose,
}: {
  open: boolean;
  location: Location | null;
  isFirst: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const action = saveLocationAction.bind(null, location?.id ?? null);
  const [state, formAction] = useActionState(action, {});

  useEffect(() => {
    if (state.ok) {
      toast({ title: location ? "Location updated" : "Location added" });
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok, state]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={location ? `Edit ${location.name}` : "New location"}
      description="Where customers collect from, and where your crew loads the van."
      size="lg"
    >
      <form action={formAction} className="space-y-4">
        {state.error ? <Banner tone="danger">{state.error}</Banner> : null}

        <Input
          name="name"
          label="Name"
          required
          defaultValue={location?.name ?? ""}
          error={state.fieldErrors?.name}
          placeholder="Main warehouse"
        />
        <Input
          name="address"
          label="Street address"
          required
          defaultValue={location?.address ?? ""}
          error={state.fieldErrors?.address}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input name="zipCode" label="Postcode" defaultValue={location?.zipCode ?? ""} />
          <Input
            name="city"
            label="City"
            required
            defaultValue={location?.city ?? ""}
            error={state.fieldErrors?.city}
          />
          <Input
            name="country"
            label="Country"
            defaultValue={location?.country ?? "DK"}
            maxLength={2}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            name="latitude"
            label="Latitude"
            inputMode="decimal"
            defaultValue={location?.latitude ?? ""}
            hint="From Google Maps: right-click the spot."
          />
          <Input
            name="longitude"
            label="Longitude"
            inputMode="decimal"
            defaultValue={location?.longitude ?? ""}
          />
        </div>

        <Checkbox
          name="isPrimary"
          defaultChecked={location?.isPrimary ?? isFirst}
          label="This is our main location"
          description="Delivery distance is measured from here."
        />
        <Checkbox
          name="isActive"
          defaultChecked={location?.isActive ?? true}
          label="Active"
        />

        <div className="flex justify-end gap-2 pt-2">
          <ModalClose asChild>
            <Button variant="secondary">Cancel</Button>
          </ModalClose>
          <SaveButton label={location ? "Save changes" : "Add location"} />
        </div>
      </form>
    </Modal>
  );
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {label}
    </Button>
  );
}
