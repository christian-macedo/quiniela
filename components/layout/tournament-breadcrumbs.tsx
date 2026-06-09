import { Fragment } from "react";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export interface BreadcrumbCrumb {
  label: string;
  /** Omit on the current (last) page so it renders as plain text. */
  href?: string;
}

interface TournamentBreadcrumbsProps {
  tournamentId: string;
  tournamentName: string;
  /** Trailing crumbs after the tournament name; the last one is the current page. */
  items?: BreadcrumbCrumb[];
}

/**
 * Breadcrumb trail for tournament sub-pages. The tournament name always links
 * back to the tournament summary (`/{tournamentId}`), giving every child page an
 * explicit path home regardless of how the user arrived.
 */
export function TournamentBreadcrumbs({
  tournamentId,
  tournamentName,
  items = [],
}: TournamentBreadcrumbsProps) {
  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={`/${tournamentId}`}>{tournamentName}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {items.map((crumb, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast || !crumb.href ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
