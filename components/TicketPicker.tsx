"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ui/terminal.module.css";
import ticketStyles from "./TicketPicker.module.css";

export type TicketRef = {
  repo: string;
  number: number;
  title: string;
  htmlUrl: string;
};

type GithubRepo = { name: string; fullName: string; description: string | null };
type GithubIssue = {
  number: number;
  title: string;
  state: string;
  htmlUrl: string;
  repo: string;
};

const LAST_REPO_KEY = "buildapp:lastTicketRepo";
const ISSUE_URL_RE = /github\.com\/[^/]+\/([^/]+)\/issues\/(\d+)/i;

function readLastRepo() {
  try {
    return localStorage.getItem(LAST_REPO_KEY);
  } catch {
    return null;
  }
}
function writeLastRepo(name: string) {
  try {
    localStorage.setItem(LAST_REPO_KEY, name);
  } catch {
    // Remembering the repo is a convenience only.
  }
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Closes a popover when a mousedown lands outside `ref`. */
function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void) {
  const cb = useRef(onOutside);
  useEffect(() => {
    cb.current = onOutside;
  });
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) cb.current();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref]);
}

/** Arrow/Enter/Escape handling shared by both listboxes. */
function listKeyDown(
  e: React.KeyboardEvent,
  count: number,
  active: number,
  setActive: (i: number) => void,
  onPick: (i: number) => void,
  onClose: () => void
) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (count) setActive((active + 1) % count);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (count) setActive((active - 1 + count) % count);
  } else if (e.key === "Enter") {
    // Never let Enter submit the surrounding build form.
    e.preventDefault();
    if (count && active >= 0) onPick(active);
  } else if (e.key === "Escape") {
    e.preventDefault();
    onClose();
  }
}

function RepoDropdown({
  repos,
  loading,
  selected,
  onSelect,
}: {
  repos: GithubRepo[];
  loading: boolean;
  selected: string;
  onSelect: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? repos.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description ?? "").toLowerCase().includes(q)
      )
    : repos;

  function close() {
    setOpen(false);
    setSearch("");
  }
  useClickOutside(wrapRef, close);

  function pick(name: string) {
    onSelect(name);
    close();
    triggerRef.current?.focus();
  }

  return (
    <div ref={wrapRef} className={ticketStyles.repoWrap}>
      <button
        ref={triggerRef}
        type="button"
        className={ticketStyles.repoTrigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          setActive(Math.max(0, repos.findIndex((r) => r.name === selected)));
        }}
        disabled={loading || repos.length === 0}
        title={selected}
      >
        <span className={ticketStyles.repoTriggerLabel}>
          {loading ? "Loading repos…" : selected || "No repos"}
        </span>
        <span className={ticketStyles.repoChevron} aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className={ticketStyles.repoDropdown}>
          <input
            autoFocus
            className={ticketStyles.repoSearchInput}
            placeholder={`Filter ${repos.length} repos…`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) =>
              listKeyDown(
                e,
                filtered.length,
                active,
                setActive,
                (i) => pick(filtered[i].name),
                () => {
                  close();
                  triggerRef.current?.focus();
                }
              )
            }
            role="combobox"
            aria-expanded
            aria-controls="repo-listbox"
            aria-activedescendant={filtered[active] ? `repo-opt-${active}` : undefined}
            autoComplete="off"
          />
          <div id="repo-listbox" role="listbox" className={ticketStyles.list}>
            {filtered.length === 0 && (
              <div className={ticketStyles.empty}>No repo matches “{search}”</div>
            )}
            {filtered.map((r, i) => (
              <button
                key={r.name}
                id={`repo-opt-${i}`}
                role="option"
                aria-selected={r.name === selected}
                type="button"
                tabIndex={-1}
                className={[
                  ticketStyles.option,
                  i === active ? ticketStyles.optionActive : "",
                ].join(" ")}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(r.name);
                }}
              >
                <span className={ticketStyles.check} aria-hidden>
                  {r.name === selected ? "✓" : ""}
                </span>
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span className={ticketStyles.repoName}>{r.name}</span>
                  {r.description && (
                    <span className={ticketStyles.repoDesc}>{r.description}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TicketPicker({
  tickets,
  onChange,
}: {
  tickets: TicketRef[];
  onChange: (tickets: TicketRef[]) => void;
}) {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [reposLoading, setReposLoading] = useState(true);
  const [reposError, setReposError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GithubIssue[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [searchError, setSearchError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 300);
  const requestKey = `${selectedRepo}|${debouncedQuery.trim()}`;
  const searching = open && !!selectedRepo && loadedKey !== requestKey;

  useEffect(() => {
    fetch("/api/github/repos")
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || !Array.isArray(data)) {
          throw new Error(data?.error ?? `HTTP ${r.status}`);
        }
        return data as GithubRepo[];
      })
      .then((data) => {
        setRepos(data);
        const last = readLastRepo();
        const initial = data.find((r) => r.name === last)?.name ?? data[0]?.name ?? "";
        setSelectedRepo(initial);
      })
      .catch((err: Error) => setReposError(err.message))
      .finally(() => setReposLoading(false));
  }, []);

  // Fetch issues while the list is open: recent open issues for an empty query,
  // otherwise a search. Stale responses are dropped on cleanup.
  useEffect(() => {
    if (!open || !selectedRepo) return;
    let cancelled = false;
    fetch(
      `/api/github/issues?repo=${encodeURIComponent(selectedRepo)}&q=${encodeURIComponent(
        debouncedQuery.trim()
      )}`
    )
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !Array.isArray(data)) throw new Error(data?.error ?? `HTTP ${res.status}`);
        return data as GithubIssue[];
      })
      .then((data) => {
        if (cancelled) return;
        setResults(data);
        setSearchError(null);
        setActive(0);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setSearchError(`GitHub search failed: ${err.message}`);
        setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoadedKey(`${selectedRepo}|${debouncedQuery.trim()}`);
      });
    return () => {
      cancelled = true;
    };
  }, [open, selectedRepo, debouncedQuery]);

  useClickOutside(searchWrapRef, () => setOpen(false));

  const isLinked = (i: GithubIssue) =>
    tickets.some((t) => t.repo === i.repo && t.number === i.number);

  function selectRepo(name: string) {
    setSelectedRepo(name);
    writeLastRepo(name);
    setResults([]);
  }

  function addTicket(issue: GithubIssue) {
    if (!isLinked(issue)) {
      onChange([
        ...tickets,
        { repo: issue.repo, number: issue.number, title: issue.title, htmlUrl: issue.htmlUrl },
      ]);
    }
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function onQueryChange(value: string) {
    // A pasted issue URL switches to its repo and looks up the number directly.
    const m = value.match(ISSUE_URL_RE);
    if (m && repos.some((r) => r.name === m[1])) {
      selectRepo(m[1]);
      value = m[2];
    }
    setQuery(value);
    setOpen(true);
  }

  return (
    <div className={ticketStyles.root}>
      {tickets.length > 0 && (
        <ul className={ticketStyles.chips}>
          {tickets.map((t) => (
            <li key={`${t.repo}#${t.number}`} className={ticketStyles.chip}>
              <span className={ticketStyles.chipRepo}>{t.repo}</span>
              <a
                href={t.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className={ticketStyles.chipLink}
                title="Open on GitHub"
              >
                <span className={ticketStyles.chipNum}>#{t.number}</span>
                <span className={ticketStyles.chipTitle}>{t.title}</span>
              </a>
              <button
                type="button"
                className={ticketStyles.chipRemove}
                onClick={() =>
                  onChange(tickets.filter((x) => !(x.repo === t.repo && x.number === t.number)))
                }
                aria-label={`Remove ${t.repo}#${t.number}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className={ticketStyles.inputRow}>
        <RepoDropdown
          repos={repos}
          loading={reposLoading}
          selected={selectedRepo}
          onSelect={selectRepo}
        />

        <div ref={searchWrapRef} className={ticketStyles.searchWrap}>
          <input
            ref={inputRef}
            className={[styles.input, ticketStyles.searchInput].join(" ")}
            placeholder={
              selectedRepo ? "Search title, #number, or paste issue URL" : "Pick a repo first"
            }
            disabled={!selectedRepo}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
                e.preventDefault();
                setOpen(true);
                return;
              }
              listKeyDown(
                e,
                results.length,
                active,
                setActive,
                (i) => addTicket(results[i]),
                () => setOpen(false)
              );
            }}
            role="combobox"
            aria-expanded={open}
            aria-controls="issue-listbox"
            aria-activedescendant={open && results[active] ? `issue-opt-${active}` : undefined}
            autoComplete="off"
          />
          {searching && <span className={ticketStyles.spinner} aria-hidden />}

          {open && selectedRepo && (
            <div className={ticketStyles.dropdown}>
              <div className={ticketStyles.dropdownHead}>
                {query.trim() ? `Results in ${selectedRepo}` : `Recent open issues in ${selectedRepo}`}
              </div>
              <div id="issue-listbox" role="listbox" className={ticketStyles.list}>
                {results.length === 0 && (
                  <div className={ticketStyles.empty}>
                    {searching ? "Searching…" : searchError ?? "No issues found"}
                  </div>
                )}
                {results.map((issue, i) => {
                  const linked = isLinked(issue);
                  return (
                    <button
                      key={issue.number}
                      id={`issue-opt-${i}`}
                      role="option"
                      aria-selected={linked}
                      type="button"
                      tabIndex={-1}
                      className={[
                        ticketStyles.option,
                        i === active ? ticketStyles.optionActive : "",
                        linked ? ticketStyles.optionLinked : "",
                      ].join(" ")}
                      onMouseEnter={() => setActive(i)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addTicket(issue);
                      }}
                    >
                      <span className={ticketStyles.issueNum}>#{issue.number}</span>
                      <span className={ticketStyles.issueTitle}>{issue.title}</span>
                      <span
                        className={[
                          ticketStyles.issueState,
                          linked
                            ? ticketStyles.stateLinked
                            : issue.state === "open"
                              ? ticketStyles.stateOpen
                              : ticketStyles.stateClosed,
                        ].join(" ")}
                      >
                        {linked ? "linked" : issue.state}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className={ticketStyles.dropdownFoot}>↑↓ move · ↵ link · esc close</div>
            </div>
          )}
        </div>
      </div>

      {reposError && (
        <span className={ticketStyles.error}>
          Couldn&apos;t load GitHub repos ({reposError}). You can still publish without linking
          issues.
        </span>
      )}
    </div>
  );
}
