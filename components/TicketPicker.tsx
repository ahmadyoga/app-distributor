"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
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
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = search.trim()
    ? repos.filter((r) =>
        r.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : repos;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function pick(name: string) {
    onSelect(name);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={wrapRef} className={ticketStyles.repoWrap}>
      <button
        type="button"
        className={ticketStyles.repoTrigger}
        onClick={() => {
          setOpen((v) => !v);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        disabled={loading}
      >
        <span className={ticketStyles.repoTriggerLabel}>
          {loading ? "Loading…" : selected || "Select repo"}
        </span>
        <span className={ticketStyles.repoChevron}>▾</span>
      </button>

      {open && (
        <div className={ticketStyles.repoDropdown}>
          <div className={ticketStyles.repoSearchWrap}>
            <input
              ref={inputRef}
              className={ticketStyles.repoSearchInput}
              placeholder="Search repo…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className={ticketStyles.repoList}>
            {filtered.length === 0 && (
              <div className={ticketStyles.repoEmpty}>No repos found</div>
            )}
            {filtered.map((r) => (
              <button
                key={r.name}
                type="button"
                className={[
                  ticketStyles.repoItem,
                  r.name === selected ? ticketStyles.repoItemActive : "",
                ].join(" ")}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(r.name);
                }}
              >
                {r.name}
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
  const [reposLoading, setReposLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GithubIssue[]>([]);
  const [searching, setSearching] = useState(false);
  const [issueDropOpen, setIssueDropOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const issueDropRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query, 350);

  useEffect(() => {
    setReposLoading(true);
    fetch("/api/github/repos")
      .then((r) => r.json())
      .then((data: GithubRepo[]) => {
        setRepos(data);
        if (data.length > 0) setSelectedRepo(data[0].name);
      })
      .catch(() => {})
      .finally(() => setReposLoading(false));
  }, []);

  const doSearch = useCallback(
    async (repo: string, q: string) => {
      if (!repo || !q.trim()) {
        setResults([]);
        setIssueDropOpen(false);
        return;
      }
      setSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(
          `/api/github/issues?repo=${encodeURIComponent(repo)}&q=${encodeURIComponent(q.trim())}`
        );
        const data = (await res.json()) as GithubIssue[] | { error: string };
        if ("error" in data) {
          setSearchError(data.error);
          setResults([]);
        } else {
          const filtered = data.filter(
            (i) => !tickets.some((t) => t.repo === repo && t.number === i.number)
          );
          setResults(filtered);
          setIssueDropOpen(true);
        }
      } catch {
        setSearchError("Failed to reach GitHub");
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [tickets]
  );

  useEffect(() => {
    doSearch(selectedRepo, debouncedQuery);
  }, [debouncedQuery, selectedRepo, doSearch]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        issueDropRef.current &&
        !issueDropRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIssueDropOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function addTicket(issue: GithubIssue) {
    onChange([
      ...tickets,
      {
        repo: issue.repo,
        number: issue.number,
        title: issue.title,
        htmlUrl: issue.htmlUrl,
      },
    ]);
    setQuery("");
    setResults([]);
    setIssueDropOpen(false);
    inputRef.current?.focus();
  }

  function removeTicket(repo: string, number: number) {
    onChange(tickets.filter((t) => !(t.repo === repo && t.number === number)));
  }

  return (
    <div className={ticketStyles.root}>
      {tickets.length > 0 && (
        <div className={ticketStyles.chips}>
          {tickets.map((t) => (
            <div key={`${t.repo}#${t.number}`} className={ticketStyles.chip}>
              <span className={ticketStyles.chipRepo}>{t.repo}</span>
              <span className={ticketStyles.chipNum}>#{t.number}</span>
              <span className={ticketStyles.chipTitle}>{t.title}</span>
              <button
                type="button"
                className={ticketStyles.chipRemove}
                onClick={() => removeTicket(t.repo, t.number)}
                aria-label={`Remove ${t.repo}#${t.number}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={ticketStyles.inputRow}>
        <RepoDropdown
          repos={repos}
          loading={reposLoading}
          selected={selectedRepo}
          onSelect={(name) => {
            setSelectedRepo(name);
            setQuery("");
            setResults([]);
            setIssueDropOpen(false);
          }}
        />

        <div className={ticketStyles.searchWrap}>
          <input
            ref={inputRef}
            className={[styles.input, ticketStyles.searchInput].join(" ")}
            placeholder="#175 or keyword…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) {
                setIssueDropOpen(false);
                setResults([]);
              }
            }}
            onFocus={() => {
              if (results.length > 0) setIssueDropOpen(true);
            }}
            autoComplete="off"
          />
          {searching && <span className={ticketStyles.spinner} aria-hidden />}

          {issueDropOpen && (
            <div ref={issueDropRef} className={ticketStyles.dropdown}>
              {results.length === 0 && !searching && query.trim() && (
                <div className={ticketStyles.dropdownEmpty}>No issues found</div>
              )}
              {results.map((issue) => (
                <button
                  key={issue.number}
                  type="button"
                  className={ticketStyles.dropdownItem}
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
                      issue.state === "open"
                        ? ticketStyles.stateOpen
                        : ticketStyles.stateClosed,
                    ].join(" ")}
                  >
                    {issue.state}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {searchError && (
        <span style={{ fontSize: 11, color: "var(--danger)" }}>{searchError}</span>
      )}
    </div>
  );
}
