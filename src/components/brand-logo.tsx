import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandLogo({
  href = "/",
  label,
  className,
  heightClass = "h-9",
  showLink = true,
}: {
  href?: string;
  label?: string;
  className?: string;
  heightClass?: string;
  showLink?: boolean;
}) {
  const content = (
    <>
      <Image
        src="/brand/wtva-logo.jpg"
        alt="Where The Vibes At"
        width={1024}
        height={493}
        priority
        className={cn("w-auto mix-blend-multiply", heightClass)}
      />
      {label ? (
        <span className="text-sm font-bold text-foreground/80">{label}</span>
      ) : null}
    </>
  );

  if (!showLink) {
    return (
      <div className={cn("inline-flex items-center gap-2.5", className)} aria-label="Where The Vibes At">
        {content}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label="Where The Vibes At"
    >
      {content}
    </Link>
  );
}
