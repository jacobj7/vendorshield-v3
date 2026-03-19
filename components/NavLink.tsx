"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ComponentProps } from "react";

type NavLinkProps = ComponentProps<typeof Link> & {
  activeClassName?: string;
  exactMatch?: boolean;
};

export default function NavLink({
  href,
  className,
  activeClassName = "active",
  exactMatch = false,
  children,
  ...props
}: NavLinkProps) {
  const pathname = usePathname();
  const hrefString = href.toString();

  const isActive = exactMatch
    ? pathname === hrefString
    : pathname === hrefString || pathname.startsWith(hrefString + "/");

  const combinedClassName = [
    typeof className === "string" ? className : "",
    isActive ? activeClassName : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Link
      href={href}
      className={combinedClassName || undefined}
      aria-current={isActive ? "page" : undefined}
      {...props}
    >
      {children}
    </Link>
  );
}
