# Frontend Project Guidelines

Conventions and patterns for new frontend projects on this stack:

- **React** + **TypeScript** (strict)
- **Vite** build tool / dev server
- **React Router** for routing
- **Ant Design v6** as the only UI component library
- **TanStack Query** for server state + **axios** for HTTP
- **SASS** for the small amount of custom styling
- Built to a static bundle, served by **nginx** in a Docker image, published to a container registry via GitHub Actions

---

## 1. Project Structure

Organize `src/` by concern, with one folder per route under `pages/`. Code used by a single route lives in that route's folder; shared code lives in a top-level folder.

```
src/
├── App.tsx              # providers + route table only
├── main.tsx             # ReactDOM root + top-level providers
├── themeConfig.ts       # Ant Design theme tokens
├── app.sass             # global styles / font imports
├── assets/              # static data + images
├── components/          # reusable UI shared by 2+ pages
├── contexts/            # cross-cutting React contexts (auth, ...)
├── layouts/             # shared page shells (see §4)
├── pages/               # one folder per route/feature
│   └── <feature>/
│       ├── <feature>Page.tsx   # entry; composes the pieces below
│       └── ...                 # page-local components
├── requests/            # API layer: one file per domain, hooks only
├── http/                # axios clients + interceptors (see §2)
├── types/               # shared TS types, one file per domain
└── utils/               # pure helpers, one file per concern
```

### Rules

- **Shared vs. page-local components.** Put a component in `components/` only when 2+ pages use it; otherwise keep it in the page folder. Don't pre-emptively promote.
- **Pages are feature folders** named `<feature>/`, with a `<feature>Page.tsx` entry that composes smaller pieces (modals, lists, forms) kept alongside it.
- **`requests/` is the only place that talks to the network.** No `axios`/`fetch` in components or pages; one file per domain, exporting hooks (§2).
- **`types/` holds shared/domain types**, one file per domain. Keep single-use types in their file until shared.
- **`utils/` is a directory, not a single file** — one file per concern (`token.ts`, `format.ts`, `date.ts`). Avoid a catch-all `utils.ts`.
- **`contexts/` holds cross-cutting state** (auth, theme, feature flags). Don't use context for state a single page owns.
- **`App.tsx` stays thin** — providers and the route table only.

---

## 2. Data Fetching

All server interaction is exposed as **custom hooks** in `requests/`, built on **TanStack Query** over shared **axios** clients. Components call hooks, never axios directly.

### HTTP clients

Define two axios instances once, in `http/`. Auth requirement is expressed by **which client a request uses** — no per-call flags to forget.

```ts
// http/clients.ts
import axios from "axios";
import { getValidAccessToken, onAuthExpired } from "../utils/tokenStore";

const baseURL = import.meta.env.VITE_API_URL;

// Public: auth endpoints (login/refresh) and unauthenticated calls. Never attaches a token.
export const publicClient = axios.create({ baseURL });

// Authenticated: everything behind login.
export const apiClient = axios.create({ baseURL });

// Proactive refresh: attach a valid token (refreshing if near expiry) before each request.
apiClient.interceptors.request.use(async (config) => {
  config.headers.Authorization = `Bearer ${await getValidAccessToken()}`;
  return config;
});

// Reactive refresh: on 401, refresh once and replay; if that fails, signal logout.
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retried) {
      original._retried = true;
      try {
        await getValidAccessToken(); // force refresh
        return apiClient(original); // replay once
      } catch {
        onAuthExpired(); // clears tokens + notifies React (§3)
      }
    }
    return Promise.reject(error);
  }
);
```

- Use **`publicClient`** for `login`/`refresh` so the interceptors never try to attach or refresh a token on the very calls that issue one (avoids loops).
- Both refresh strategies are in play: **proactive** (request interceptor checks expiry) and **reactive** (401 retry). The token store (§3) makes both safe under concurrency.
- _Alternative:_ a single client with a `skipAuth` flag on the request config also works; if you choose that, default to authenticated and opt out explicitly. Two named clients are preferred for being explicit.

### Conventions

- **One file per domain** in `requests/`, exporting `useX` hooks.
- **Query keys are arrays** starting with the domain plus every parameter that changes the result: `["entity", id, filter]`. Keep keys identical across `useQuery`, `setQueryData`, and `invalidateQueries`.
- **Return a small, explicit shape** from the hook, not the whole query/mutation object.
- **Non-hook helpers** (e.g. a blob download triggered by a click) are plain async functions using the same client.

### Query hook

Hooks just call the client — token handling is automatic.

```ts
export const useEntities = (filter: Filter) =>
  useQuery<Entity[]>({
    queryKey: ["entities", filter],
    queryFn: async () =>
      (await apiClient.get("/entities", { params: { filter } })).data,
  });
```

### Optimistic mutation

For mutations needing instant feedback, update the cache before the request resolves and roll back on error (`onMutate` → `onError` → `onSettled`):

```ts
const updateStatus = useMutation({
  mutationFn: (vars: UpdateParams) => apiClient.post("/entities/status", vars),
  onMutate: async (vars) => {
    const key = ["entities", vars.filter];
    await queryClient.cancelQueries({ queryKey: key }); // stop in-flight refetches
    const previous = queryClient.getQueryData<Entity[]>(key); // snapshot for rollback
    queryClient.setQueryData<Entity[]>(key, (old) =>
      old?.map((e) => (e.id === vars.id ? { ...e, ...vars } : e))
    );
    return { key, previous };
  },
  onError: (_e, _v, ctx) =>
    ctx && queryClient.setQueryData(ctx.key, ctx.previous),
  onSettled: (_d, _e, _v, ctx) =>
    ctx && queryClient.invalidateQueries({ queryKey: ctx.key }),
});
```

Rules:

- Snapshot and restore the **whole cached value** of the same shape (the full list), not a single item.
- Use the **identical key** (including every param) in `onMutate`, `setQueryData`, and `invalidateQueries`, or the update silently misses.
- `onSettled` invalidates so the cache reconciles with the server.

### Polling

```ts
useQuery({
  queryKey: ["task", taskId],
  queryFn: ...,
  enabled: !!taskId,
  refetchInterval: (q) => (q.state.data?.status === "PENDING" ? 4000 : false),
});
```

### Provider setup

Wrap the app once in `main.tsx` with `<QueryClientProvider>`. Give the `QueryClient` deliberate defaults (`staleTime`, `retry`) rather than relying on library defaults.

---

## 3. Authentication

Token logic lives in a **framework-agnostic token store** (a plain module, not a hook) so both the axios interceptors (§2) and React can use it. `AuthContext` is a thin React wrapper for components.

### Token store

```ts
// utils/tokenStore.ts — no React
let refreshPromise: Promise<string> | null = null;
const listeners = new Set<() => void>();

export const subscribeAuthExpired = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const onAuthExpired = () => {
  clearTokens();
  listeners.forEach((fn) => fn());
};

export async function getValidAccessToken(): Promise<string> {
  const at = getAccessToken();
  if (at && !isTokenExpired(at)) return at; // small expiry buffer via jwt-decode

  if (!getRefreshToken()) {
    onAuthExpired();
    throw new Error("No refresh token");
  }
  if (refreshPromise) return refreshPromise; // dedupe concurrent refreshes

  refreshPromise = (async () => {
    try {
      const { data } = await publicClient.post("/auth/refresh", {
        refresh_token: getRefreshToken(),
      });
      setTokens(data.access_token, data.refresh_token);
      return data.access_token as string;
    } catch (e) {
      onAuthExpired();
      throw e;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}
```

Key points:

- **Tokens in `localStorage`.** Read/write only through the store.
- **Single token accessor.** `getValidAccessToken()` returns a valid token, refreshing if needed — the interceptors call it.
- **Dedupe concurrent refreshes** with a module-level promise so a burst of requests triggers one refresh.
- **Fail closed.** On any refresh failure, clear tokens and notify listeners.

### AuthContext

A thin wrapper exposing what components need: `isAuthenticated`, `isLoading`, `login`, `logout`. It subscribes to the store's expiry signal and flips `isAuthenticated` to `false`, so an interceptor-triggered logout propagates to the UI. `login`/`logout` use `publicClient`.

### ProtectedRoute (router-level)

A guard that shows a spinner while auth resolves, otherwise redirects unauthenticated users to login (remembering where they were headed) and renders the matched route via `<Outlet />`:

```tsx
const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <CenteredSpinner />;
  if (!isAuthenticated)
    return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
};
```

Apply it **in the router**, wrapping protected routes — never inside individual page components (easy to forget, couples pages to auth). See §4. After login, redirect back:

```tsx
await login(values);
navigate(location.state?.from?.pathname ?? "/");
```

---

## 4. Layout

Compose shared chrome with **React Router layout routes** and `<Outlet />` — never by wrapping each page's JSX manually. A layout renders the shell once; the matched page renders into the outlet.

```tsx
// layouts/AppShell.tsx
export default function AppShell() {
  return (
    <>
      <AppBar />
      <main style={{ minHeight: "100vh" }}>
        <Outlet />
      </main>
    </>
  );
}
```

```tsx
// App.tsx — layouts and guards compose declaratively
<Routes>
  <Route element={<AppShell />}>
    <Route path="/" element={<HomePage />} /> {/* public shell */}
  </Route>
  <Route path="/login" element={<LoginPage />} /> {/* bare */}
  <Route element={<ProtectedRoute />}>
    {" "}
    {/* guard via Outlet */}
    <Route element={<AppShell />}>
      <Route path="/dashboard" element={<DashboardPage />} />
    </Route>
  </Route>
</Routes>
```

Rules:

- **Make shells configurable through real props or context** — never hardcode values behind a prop you then ignore.
- **Pages don't import layouts.** The router composes layout + page.
- **Reuse one shell** across public and protected areas; differ only by the guard wrapping them.

---

## 5. Build & Deployment

### Dockerfile (multi-stage)

Build with Node, serve the static bundle with nginx. Copy the manifest + lockfile first so dependency installs cache:

```dockerfile
FROM node:22 AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM nginx:1.27
COPY default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
```

nginx needs an SPA fallback so client-side routes survive a refresh:

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Env vars

- All build-time config goes through `VITE_*` vars (`VITE_BASE_URL`, `VITE_API_URL`), baked in at build time — so CI must have the `.env` present before building.
- In CI, write `.env` from a single environment secret.

### CI: build on a version tag, not every push

Trigger image builds on a semver git tag (`vMAJOR.MINOR.PATCH`) so a release is deliberate, rather than rebuilding on every commit.

```yaml
name: Docker Image CI
on:
  push:
    tags: ["v*.*.*"] # only tagged releases build
env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}
jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - name: Add .env
        run: echo "${{ secrets.ENV_FILE }}" > .env
      - name: Login to registry
        uses: docker/login-action@v3.4.0
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Image metadata
        id: meta
        uses: docker/metadata-action@v5.7.0
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=raw,value=latest
      - name: Build and push
        uses: docker/build-push-action@v6.18.0
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
```

Release flow:

```bash
git tag v0.1.0 && git push origin v0.1.0   # triggers build & publish
```

- **Tags are releases.** `type=semver` patterns derive image tags from the git tag automatically.
- Keep pushes to the main branch cheap (lint/test); reserve image builds for tags.
- Pin action versions for reproducible CI.

---

## 6. Ant Design Usage

### Styling & Theming

- **Ant Design is the only component library.** Don't mix in a second UI kit.
- **Theme centrally** in `themeConfig.ts` and apply via `<ConfigProvider theme={themeConfig}>` at the root. Read tokens with `theme.useToken()` rather than hardcoding colors/fonts.
- **Custom styling is minimal**: a global `app.sass` for resets/fonts, and a co-located `.sass` file next to a component only for things Ant Design can't express (e.g. animations). Avoid large reusable inline `style` objects.
- No CSS-in-JS / Tailwind by default — keep the styling surface small and consistent.

### Layout components: `Row`/`Col` vs. `Flex` vs. `Space`

These are **not interchangeable alternatives** — they sit at different levels of abstraction. Pick based on intent:

| Component     | Underlying CSS                                                  | Use it for                                                               |
| ------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `Row` / `Col` | 24-column responsive **grid**                                   | Page/section skeleton — columns that reflow at breakpoints               |
| `Flex`        | A thin wrapper over **flexbox**                                 | General 1-D layout where **alignment** matters (justify/align/wrap/grow) |
| `Space`       | Gap between **inline-ish siblings** (wraps each child in a div) | Spacing a small, fixed set of elements (buttons, tags, icon+label)       |

Mental shortcut:

- **Macro layout / responsive columns** → `Row` + `Col` (use breakpoint props `xs`/`sm`/`md`/`lg`/`xl`; that responsiveness is the whole reason to reach for it). Nest `Flex`/`Space` _inside_ a `Col`.
- **Arrange a group with alignment** → `Flex` (`justify`, `align`, `wrap`, `gap`). The default for toolbars, card headers, "label + control" rows, and wrapping lists.
- **Just gap these few things** → `Space` (a row of buttons/tags). Nothing more.

The one real overlap is `Flex` vs. `Space`:

- Use **`Space`** only for a tiny, fixed inline cluster with no alignment needs. `Space.Compact` joins controls into one visual unit (input + button).
- Use **`Flex`** the moment you need `justify`, growing/wrapping children, full-width distribution, or vertical stacking of variable content.
- If both seem to work, **prefer `Flex`** — fewer wrapper divs, clearer intent.
- A `Col` without responsive span props and without a `Row` is a smell — you probably wanted `Flex` or `Space`.

### API conventions & Ant Design v6 deprecations

> ⚠️ **AI agents frequently emit v5 (now-deprecated) prop names.** Target **antd v6**: many props were renamed for a consistent API. The old names still work but log console deprecation warnings and are slated for removal in v7. Always use the v6 names.

The renames follow recognizable **patterns** — internalize the patterns, not just the list:

- **`direction` → `orientation`**: `Space`, `Space.Compact`, `Steps`, `Flex` (use `orientation="vertical"`, not `direction="vertical"`). Related: `Divider` `type` → `orientation`; `Splitter` `layout` → `orientation`.
- **`*Position` → `*Placement`**: `Button` `iconPosition` → `iconPlacement`; `Carousel` `dotPosition` → `dotPlacement`; `Collapse` `expandIconPosition` → `expandIconPlacement`; `Tabs` `tabPosition` → `tabPlacement`; `Steps` `labelPlacement` → `titlePlacement`; `Progress` `gapPosition` → `gapPlacement`.
- **`bordered` → `variant`**: `Card`, `Select`, `Cascader`, `DatePicker`, `InputNumber`, `TreeSelect` (`bordered={false}` → `variant="borderless"`/`"filled"`). For `Tag`: `bordered={false}` → `variant="filled"`, `color="xxx-inverse"` → `variant="solid"`.
- **`xxxStyle` → `styles.xxx`** (semantic styles object): `headStyle`/`bodyStyle` → `styles.header`/`styles.body` (`Card`, `Modal`, `Drawer`); `labelStyle`/`contentStyle` → `styles.label`/`styles.content` (`Descriptions`); `Tooltip` `overlayStyle`/`overlayInnerStyle` → `styles.root`/`styles.container`. Matching `xxxClassName` props move to `classNames.xxx`.
- **Dropdown/popup props unify**: `dropdownClassName`/`popupClassName` → `classNames.popup.root`; `dropdownStyle` → `styles.popup.root`; `dropdownRender` → `popupRender`; `onDropdownVisibleChange`/`onPopupVisibleChange` → `onOpenChange`; `dropdownMatchSelectWidth` → `popupMatchSelectWidth` (`Select`, `Cascader`, `TreeSelect`, `AutoComplete`, `ConfigProvider`).
- **`destroy*` unify → `destroyOnHidden`**: `destroyOnClose` (`Modal`), `destroyInactivePanel` (`Collapse`/`Drawer`), `destroyInactiveTabPane` (`Tabs`), `destroyPopupOnHide` (`Dropdown`), `destroyTooltipOnHide` (`Tooltip`).
- **Compound `X.Item` children → `items` arrays**: `Tabs.TabPane`, `Timeline.Item`, `Breadcrumb.Item`, `Menu` children, `Mentions.Option`, `Anchor` children.
- **`Space`'s `split` → `separator`**.
- **Containers replaced**: `Button.Group` and `Input.Group` → `Space.Compact`; `BackTop` → `FloatButton.BackTop`; `Dropdown.Button` → `Space.Compact + Dropdown + Button`.

React 19 note: under antd v6 you do **not** need `@ant-design/v5-patch-for-react-19`. Pair `@ant-design/icons@6` with `antd@6`.

**Practical rule:** treat `direction`, `bordered`, `headStyle`/`bodyStyle`, `dropdownClassName`, `destroyOnClose`, `tabPosition`, `<Tabs.TabPane>`, `<Timeline.Item>` as stale v5 names — convert them. Treat console deprecation warnings as errors to fix.

---

## 7. Quick Checklist for a New Project

- [ ] `src/` laid out by concern (§1): shared code top-level, page-local code in the page folder.
- [ ] `utils/` is a directory of topic files, not a single `utils.ts`.
- [ ] Network access only through `useX` hooks in `requests/`; consistent array query keys.
- [ ] Two axios clients (`apiClient`/`publicClient`); token attached and refreshed by interceptors, not per call (proactive + reactive).
- [ ] Framework-agnostic token store: `localStorage`, expiry check, dedup'd refresh, fail-closed; `AuthContext` is a thin wrapper.
- [ ] Optimistic mutations follow `onMutate`/`onError`/`onSettled`, restoring the full cached value with a matching key.
- [ ] `ProtectedRoute` applied at the **router level** via layout routes + `<Outlet />`; shells are configurable, not per-page wrappers.
- [ ] Multi-stage Dockerfile with cached deps + nginx SPA fallback.
- [ ] CI builds/publishes the image **on `v*.*.*` tags**, deriving image tags from the git tag.
- [ ] Layout components by intent: `Row`/`Col` grid, `Flex` alignment, `Space` small inline clusters.
- [ ] Ant Design **v6** prop names only — no deprecated v5 names; treat console deprecation warnings as errors.
