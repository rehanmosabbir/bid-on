"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useAuction,
  useCategories,
  useUpdateAuction,
} from "@/hooks/queries";
import { RequirePermission } from "@/components/RequirePermission";
import { Auction, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { sellSchema, SellValues } from "@/lib/schemas";
import { toastFromError, toastSuccess, toastValidationErrors } from "@/lib/toast";

function durationMinutes(auction: Auction) {
  const start = auction.createdAt
    ? new Date(auction.createdAt).getTime()
    : Date.now();
  const end = new Date(auction.endsAt).getTime();
  return Math.min(43200, Math.max(1, Math.round((end - start) / 60000)));
}

function EditInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const auctionQ = useAuction(id);
  const { data: catData } = useCategories();
  const updateAuction = useUpdateAuction(id);
  const [kept, setKept] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const auction = auctionQ.data?.auction;

  const form = useForm<SellValues>({
    resolver: zodResolver(sellSchema),
    defaultValues: {
      title: "",
      description: "",
      categoryId: "",
      startPrice: 0,
      minBidIncrement: 1,
      durationMinutes: 60,
      imageUrl: "",
      reservePrice: "",
      maxPriceCap: "",
    },
  });

  useEffect(() => {
    if (!auction) return;
    setKept(Array.isArray(auction.images) ? auction.images : []);
    form.reset({
      title: auction.title,
      description: auction.description,
      categoryId: auction.category?.id || "",
      startPrice: Number(auction.startPrice) || 0,
      minBidIncrement: Number(auction.minBidIncrement) || 1,
      durationMinutes: durationMinutes(auction),
      imageUrl: "",
      reservePrice:
        auction.reservePrice != null ? String(auction.reservePrice) : "",
      maxPriceCap: auction.maxPriceCap != null ? String(auction.maxPriceCap) : "",
    });
  }, [auction, form]);

  if (auctionQ.isLoading) {
    return <p className="mx-auto max-w-2xl px-4 py-12">Loading…</p>;
  }
  if (!auction) {
    return <p className="mx-auto max-w-2xl px-4 py-12">Listing not found.</p>;
  }

  const canEdit =
    auction.status === "pending" &&
    (user?.id === auction.seller?.id || user?.role === "admin");

  if (!canEdit) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p className="text-muted-foreground">
          Only the seller can edit a listing, and only while it is still
          waiting for approval.
        </p>
        <Link href={`/auctions/${auction.id}`} className="mt-4 inline-block text-primary">
          Back to listing
        </Link>
      </div>
    );
  }

  const categoryId = form.watch("categoryId");

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)] text-4xl">
            Edit listing
          </CardTitle>
          <CardDescription>
            This listing is not live yet. Changes stay in the approval queue.
          </CardDescription>
        </CardHeader>
        <form
          onSubmit={form.handleSubmit(
            async (values) => {
              try {
                const body = new FormData();
                body.append("title", values.title);
                body.append("description", values.description);
                body.append("categoryId", values.categoryId);
                body.append("startPrice", String(values.startPrice));
                body.append("minBidIncrement", String(values.minBidIncrement));
                body.append("durationMinutes", String(values.durationMinutes));
                body.append("reservePrice", values.reservePrice || "");
                body.append("maxPriceCap", values.maxPriceCap || "");
                if (values.imageUrl) body.append("imageUrl", values.imageUrl);
                kept.forEach((image) => body.append("existingImages", image));
                files.forEach((file) => body.append("images", file));
                await updateAuction.mutateAsync(body);
                toastSuccess("Listing updated");
                router.push(`/auctions/${auction.id}`);
              } catch (err) {
                const msg = toastFromError(err, "Update failed");
                form.setError("root", { message: msg });
              }
            },
            (formErrors) => toastValidationErrors(formErrors)
          )}
        >
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...form.register("title")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                className="min-h-32"
                {...form.register("description")}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={categoryId}
                onValueChange={(value) => form.setValue("categoryId", value ?? "")}
                items={Object.fromEntries(
                  (catData?.categories || []).map((c) => [c.id, c.name])
                )}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {(catData?.categories || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startPrice">Start price (BDT)</Label>
                <Input id="startPrice" type="number" {...form.register("startPrice")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minBidIncrement">Minimum bid increment</Label>
                <Input
                  id="minBidIncrement"
                  type="number"
                  min={1}
                  {...form.register("minBidIncrement")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reservePrice">Reserve price</Label>
                <Input id="reservePrice" type="number" {...form.register("reservePrice")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPriceCap">Max bid cap</Label>
                <Input id="maxPriceCap" type="number" {...form.register("maxPriceCap")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Duration (minutes)</Label>
              <Input
                id="durationMinutes"
                type="number"
                min={1}
                {...form.register("durationMinutes")}
              />
            </div>
            <div className="space-y-2">
              <Label>Current images</Label>
              <div className="flex flex-wrap gap-2">
                {kept.map((image) => (
                  <div key={image} className="space-y-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaUrl(image)}
                      alt=""
                      className="h-16 w-20 rounded-md object-cover"
                    />
                    <button
                      type="button"
                      className="text-xs text-destructive"
                      onClick={() =>
                        setKept((current) => current.filter((item) => item !== image))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                {kept.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No images kept. Add at least one.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-images">Add images</Label>
              <Input
                id="edit-images"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) =>
                  setFiles(Array.from(event.target.files || []).slice(0, 8))
                }
              />
              {files.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {files.length} new image{files.length === 1 ? "" : "s"} selected
                </p>
              ) : null}
            </div>
            {form.formState.errors.root && (
              <p className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
          </CardContent>
          <CardFooter className="gap-3">
            <Button type="submit" disabled={updateAuction.isPending}>
              {updateAuction.isPending ? "Saving…" : "Save listing"}
            </Button>
            <Link href={`/auctions/${auction.id}`}>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function EditListingPage() {
  return (
    <RequirePermission permission="listing:create">
      <EditInner />
    </RequirePermission>
  );
}
