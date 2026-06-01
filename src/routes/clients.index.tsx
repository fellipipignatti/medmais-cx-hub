import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/clients/")({ component: Redirect });

function Redirect() {
  const nav = useNavigate();
  useEffect(() => { nav({ to: "/" }); }, [nav]);
  return null;
}
