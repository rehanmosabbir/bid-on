"use client";

import { useEffect } from "react";
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
import { sellSchema, SellValues } from "@/lib/schemas";
import { toastFromError, toastSuccess, toastValidationErrors } from "@/lib/toast";

function SellInner() {
  const router = useRouter();
  const { data: catData } = useCategories();
  const createAuction = useCreateAuction();

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
                if (values.imageUrl) body.append("imageUrl", values.imageUrl);

                const fileInput = document.getElementById(
                  "sell-images"
                ) as HTMLInputElement | null;
                if (fileInput?.files) {
                  Array.from(fileInput.files).forEach((f) =>
                    body.append("images", f)
                  );
                }

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
            <div className="grid gap-3 sm:grid-cols-3">
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
              />
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
