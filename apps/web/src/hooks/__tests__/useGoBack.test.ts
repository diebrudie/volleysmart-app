import { vi, it, expect } from "vitest";

const navigate = vi.fn();
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
import { useGoBack } from "../useGoBack";

const withIdx = (state: unknown) =>
  vi.stubGlobal("window", { history: { state } });

it("falls back to /home on the first history entry (PWA cold launch)", () => {
  withIdx({ idx: 0 });
  useGoBack()();
  expect(navigate).toHaveBeenLastCalledWith("/home", { replace: true });
  withIdx(null);
  useGoBack()();
  expect(navigate).toHaveBeenLastCalledWith("/home", { replace: true });
});

it("goes back when there is in-app history", () => {
  withIdx({ idx: 2 });
  useGoBack()();
  expect(navigate).toHaveBeenLastCalledWith(-1);
});
