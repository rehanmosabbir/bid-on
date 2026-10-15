"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { useCategories, useCreateAuction } from "@/hooks/queries";
import { RequirePermission } from "@/components/RequirePermission";
import {
  needsVerification,
  VerificationRequired,
} from "@/components/VerificationRequired";
import { useAuth } from "@/lib/auth";
import { sellSchema, SellValues } from "@/lib/schemas";
import { toastFromError, toastSuccess, toastValidationErrors } from "@/lib/toast";

function SellInner() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const { data: catData } = useCategories();
  const createAuction = useCreateAuction();
  const [files, setFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<SellValues>({
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

  const categoryId = watch("categoryId");

  useEffect(() => {
    if (catData?.categories?.[0]?.id) {
      setValue("categoryId", catData.categories[0].id);
    }
  }, [catData, setValue]);

  if (needsVerification(user)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="font-[family-name:var(--font-display)] text-4xl">
          Create listing
        </h1>
        <div className="mt-6">
          <VerificationRequired action="creating a listing" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-display)] text-4xl">
            Create listing
          </CardTitle>
          <CardDescription>
            Submissions require admin approval before going live.
          </CardDescription>
        </CardHeader>
        <form
          onSubmit={handleSubmit(
            async (values) => {
              try {
                const body = new FormData();
                body.append("title", values.title);
                body.append("description", values.description);
                body.append("categoryId", values.categoryId);
                body.append("startPrice", String(values.startPrice));
                body.append("durationMinutes", String(values.durationMinutes));
                if (values.reservePrice) {
                  body.append("reservePrice", String(values.reservePrice));
                }
                if (values.maxPriceCap) {
                  body.append("maxPriceCap", String(values.maxPriceCap));
                }
                body.append("minBidIncrement", String(values.minBidIncrement));
                if (values.imageUrl) body.append("imageUrl", values.imageUrl);
                files.forEach((file) => body.append("images", file));

                const data = await createAuction.mutateAsync(body);
                toastSuccess("Listing submitted for admin approval");
                router.push(`/auctions/${data.auction.id}`);
              } catch (err) {
                const msg = toastFromError(err, "Failed to create listing");
                setError("root", { message: msg });
              }
            },
            (formErrors) => toastValidationErrors(formErrors)
          )}
        >
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Title" {...register("title")} />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                className="min-h-32"
                placeholder="Description"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={categoryId}
                onValueChange={(value) => setValue("categoryId", value ?? "")}
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
                <Input
                  id="startPrice"
                  type="number"
                  placeholder="Opening bid"
                  {...register("startPrice")}
                />
                {errors.startPrice && (
                  <p className="text-sm text-destructive">
                    {errors.startPrice.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reservePrice">Reserve price</Label>
                <Input
                  id="reservePrice"
                  type="number"
                  placeholder="Optional"
                  {...register("reservePrice")}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum you’ll accept — auction won’t sell below this.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="minBidIncrement">Minimum bid increment</Label>
                <Input
                  id="minBidIncrement"
                  type="number"
                  min={1}
                  step="1"
                  {...register("minBidIncrement")}
                />
                <p className="text-xs text-muted-foreground">
                  Each new bid must beat the current bid by at least this
                  amount.
                </p>
                {errors.minBidIncrement && (
                  <p className="text-sm text-destructive">
                    {errors.minBidIncrement.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPriceCap">Max bid cap</Label>
                <Input
                  id="maxPriceCap"
                  type="number"
                  placeholder="Optional"
                  {...register("maxPriceCap")}
                />
                <p className="text-xs text-muted-foreground">
                  Highest bid allowed on this lot.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="durationMinutes">Duration (minutes)</Label>
              <Input
                id="durationMinutes"
                type="number"
                min={1}
                placeholder="e.g. 60"
                {...register("durationMinutes")}
              />
              <p className="text-xs text-muted-foreground">
                How long the auction runs after it goes live (1–43200 min).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sell-images">Images</Label>
              <Input
                id="sell-images"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) =>
                  setFiles(Array.from(event.target.files || []).slice(0, 8))
                }
              />
              {files.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto">
                  {files.map((file) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`${file.name}-${file.lastModified}`}
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="h-16 w-20 rounded-md object-cover"
                    />
                  ))}
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Select every photo at once. All of them appear on the listing.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Or paste image URL</Label>
              <Input id="imageUrl" {...register("imageUrl")} />
            </div>
            {errors.root && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}
          </CardContent>
          <CardFooter className="gap-3">
            <Button
              type="submit"
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              disabled={isSubmitting || createAuction.isPending}
            >
              Submit for approval
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function SellPage() {
  return (
    <RequirePermission permission="listing:create">
      <SellInner />
    </RequirePermission>
  );
}
