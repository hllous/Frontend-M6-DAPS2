import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Item, ItemContent, ItemDescription, ItemGroup, ItemSeparator, ItemTitle } from "./item";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./pagination";
import { Spinner } from "./spinner";

function renderPager() {
  return render(
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href="#1" />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#1">1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink href="#2" isActive>
            2
          </PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationNext href="#3" />
        </PaginationItem>
      </PaginationContent>
    </Pagination>,
  );
}

describe("shadcn Spinner", () => {
  it("announces loading in Spanish and keeps its slot", () => {
    render(<Spinner />);
    const spinner = screen.getByRole("status", { name: "Cargando" });
    expect(spinner).toHaveAttribute("data-slot", "spinner");
    expect(spinner).toHaveClass("animate-spin");
  });
});

describe("shadcn Pagination", () => {
  it("names the landmark and controls in Spanish", () => {
    renderPager();
    expect(screen.getByRole("navigation", { name: "Paginación" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Página anterior" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Página siguiente" })).toBeInTheDocument();
    expect(screen.getByText("Más páginas")).toBeInTheDocument();
  });

  it("does not hide the ellipsis text from assistive technology", () => {
    renderPager();
    expect(screen.getByText("Más páginas").closest("[aria-hidden='true']")).toBeNull();
  });

  it("marks the current page and keeps data-slot attributes", () => {
    const { container } = renderPager();
    expect(screen.getByRole("link", { name: "2" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "1" })).not.toHaveAttribute("aria-current");
    for (const slot of ["pagination", "pagination-content", "pagination-item", "pagination-link", "pagination-ellipsis"]) {
      expect(container.querySelector(`[data-slot="${slot}"]`), slot).not.toBeNull();
    }
  });

  it("is reachable with Tab in order", async () => {
    renderPager();
    const user = userEvent.setup();
    for (const name of ["Página anterior", "1", "2", "Página siguiente"]) {
      await user.tab();
      expect(screen.getByRole("link", { name })).toHaveFocus();
    }
  });

  it("gives links 40 px desktop and 48 px mobile targets", () => {
    renderPager();
    expect(screen.getByRole("link", { name: "1" })).toHaveClass("min-h-10", "[@media(max-width:760px)]:min-h-12");
  });
});

describe("shadcn Item", () => {
  it("renders structure and slots", () => {
    const { container } = render(
      <Item>
        <ItemContent>
          <ItemTitle>Título</ItemTitle>
          <ItemDescription>Detalle</ItemDescription>
        </ItemContent>
      </Item>,
    );
    for (const slot of ["item", "item-content", "item-title", "item-description"]) {
      expect(container.querySelector(`[data-slot="${slot}"]`), slot).not.toBeNull();
    }
  });

  it("renders as a focusable link with the project focus ring and tall targets", async () => {
    render(
      <Item render={<a href="#x" />}>
        <ItemContent>
          <ItemTitle>Abrir</ItemTitle>
        </ItemContent>
      </Item>,
    );
    const link = screen.getByRole("link", { name: "Abrir" });
    await userEvent.setup().tab();
    expect(link).toHaveFocus();
    expect(link).toHaveClass("focus-visible:outline-[3px]", "focus-visible:outline-[var(--color-focus)]", "[a]:min-h-10");
  });
});

describe("shadcn ItemGroup list semantics", () => {
  it("exposes every Item in a group as a listitem, keeping links as links", () => {
    render(
      <ItemGroup>
        <Item>
          <ItemContent>
            <ItemTitle>Estática</ItemTitle>
          </ItemContent>
        </Item>
        <ItemSeparator />
        <Item render={<a href="#x" />}>
          <ItemContent>
            <ItemTitle>Enlace</ItemTitle>
          </ItemContent>
        </Item>
      </ItemGroup>,
    );
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).getByRole("link", { name: "Enlace" })).toHaveAttribute("data-slot", "item");
    expect(within(list).queryByRole("separator")).toBeNull();
  });

  it("adds no role to an Item outside a group", () => {
    render(<Item>Suelta</Item>);
    expect(screen.queryByRole("listitem")).toBeNull();
  });
});
