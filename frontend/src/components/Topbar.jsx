import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  Bell,
  ChevronDown,
  Command,
  LogOut,
  Plus,
  Search,
  Settings,
  User,
  X,
} from "lucide-react";

import api from "../api/api";
import "./Topbar.css";

export default function Topbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const searchInputRef = useRef(null);
  const searchWrapperRef = useRef(null);

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);

  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        return JSON.parse(storedUser);
      }
    } catch (error) {
      console.error("Unable to read user:", error);
    }

    return null;
  });

  /*
   * ---------------------------------------------------------
   * CURRENT PAGE TITLE
   * ---------------------------------------------------------
   */

  function getPageTitle() {
  const pathname = location.pathname;

  if (pathname === "/" || pathname === "/dashboard") {
    return "Dashboard";
  }

  if (pathname.startsWith("/transactions")) {
    return "Transactions";
  }

  if (pathname.startsWith("/expenses")) {
    return "Expenses";
  }

  if (pathname.startsWith("/income")) {
    return "Income";
  }

  if (pathname.startsWith("/accounts")) {
    return "Accounts";
  }

  if (pathname.startsWith("/analytics")) {
    return "Analytics";
  }

  if (pathname.startsWith("/auto-expense")) {
    return "Auto Expense";
  }

  if (pathname.startsWith("/budget")) {
    return "Budget";
  }

  if (pathname.startsWith("/categories")) {
    return "Categories";
  }

  if (pathname.startsWith("/customers")) {
    return "Customers";
  }

  if (pathname.startsWith("/vendors")) {
    return "Vendors";
  }

  if (pathname.startsWith("/invoices")) {
    return "Invoices";
  }

  if (pathname.startsWith("/reports")) {
    return "Reports";
  }

  if (pathname.startsWith("/insights")) {
    return "AI Insights";
  }

  if (pathname.startsWith("/notifications")) {
    return "Notifications";
  }

  if (pathname.startsWith("/settings")) {
    return "Settings";
  }

  if (pathname.startsWith("/profile")) {
    return "Profile";
  }

  return "Dashboard";
}
  /*
   * ---------------------------------------------------------
   * USER INFORMATION
   * ---------------------------------------------------------
   */

  const username =
    user?.username ||
    user?.name ||
    user?.first_name ||
    user?.email?.split("@")[0] ||
    "User";

  const email = user?.email || "";

  const initials = username
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "U";

  /*
   * ---------------------------------------------------------
   * LOAD USER IF NOT ALREADY AVAILABLE
   * ---------------------------------------------------------
   */

  useEffect(() => {
    async function loadUser() {
      try {
        /*
         * If your application already stores the user in localStorage,
         * this request is unnecessary.
         *
         * The endpoint is intentionally attempted only when there
         * is no user in localStorage.
         */
        if (user) return;

        const response = await api.get("/auth/me");

        if (response.data) {
          setUser(response.data.user);

           localStorage.setItem(
         "user",
         JSON.stringify(response.data.user)
          );
        }
      } catch (error) {
        /*
         * Do not break the Topbar if this endpoint doesn't exist.
         * The fallback "User" will still be displayed.
         */
        console.warn("Unable to load current user:", error);
      }
    }

    loadUser();
  }, [user]);

  /*
   * ---------------------------------------------------------
   * SEARCH SHORTCUT
   * Ctrl + K / Cmd + K
   * ---------------------------------------------------------
   */

  useEffect(() => {
    function handleKeyboardShortcut(event) {
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();

        searchInputRef.current?.focus();

        if (search.trim()) {
          setShowSearchResults(true);
        }
      }

      if (event.key === "Escape") {
        setShowSearchResults(false);
        searchInputRef.current?.blur();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyboardShortcut
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyboardShortcut
      );
    };
  }, [search]);

  /*
   * ---------------------------------------------------------
   * SEARCH TRANSACTIONS
   * ---------------------------------------------------------
   *
   * We fetch transactions and filter them locally.
   *
   * This makes the Topbar search work even if your backend
   * doesn't currently have a dedicated search endpoint.
   */

  useEffect(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;

    async function performSearch() {
      try {
        setSearchLoading(true);

        const response = await api.get("/transactions/");

        if (cancelled) return;

        const transactions = Array.isArray(response.data)
          ? response.data
          : response.data?.results || [];

        const filtered = transactions
          .filter((transaction) => {
            const searchableText = [
              transaction.description,
              transaction.title,
              transaction.category_name,
              transaction.category,
              transaction.account_name,
              transaction.account_type,
              transaction.transaction_type,
              transaction.date,
              transaction.amount,
              transaction.id,
            ]
              .filter(
                (value) =>
                  value !== null &&
                  value !== undefined
              )
              .join(" ")
              .toLowerCase();

            return searchableText.includes(query);
          })
          .slice(0, 8);

        setSearchResults(filtered);
      } catch (error) {
        if (!cancelled) {
          console.error(
            "Topbar search error:",
            error
          );

          setSearchResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }

    const timer = setTimeout(
      performSearch,
      250
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  /*
   * ---------------------------------------------------------
   * SEARCH SUBMIT
   * ---------------------------------------------------------
   */

  function handleSearchSubmit(event) {
    event.preventDefault();

    const query = search.trim();

    if (!query) {
      navigate("/transactions");
      setShowSearchResults(false);
      return;
    }

    setShowSearchResults(false);

    navigate(
      `/transactions?search=${encodeURIComponent(query)}`
    );
  }

  /*
   * ---------------------------------------------------------
   * SEARCH INPUT
   * ---------------------------------------------------------
   */

  function handleSearchChange(event) {
    const value = event.target.value;

    setSearch(value);
    setShowSearchResults(Boolean(value.trim()));
  }

  /*
   * ---------------------------------------------------------
   * CLEAR SEARCH
   * ---------------------------------------------------------
   */

  function clearSearch() {
    setSearch("");
    setSearchResults([]);
    setShowSearchResults(false);

    searchInputRef.current?.focus();
  }

  /*
   * ---------------------------------------------------------
   * CLICK SEARCH RESULT
   * ---------------------------------------------------------
   */

  function handleSearchResultClick(transaction) {
    const query =
      transaction.description ||
      transaction.title ||
      transaction.category_name ||
      "";

    setShowSearchResults(false);

    navigate(
      `/transactions?search=${encodeURIComponent(query)}`
    );
  }

  /*
   * ---------------------------------------------------------
   * CLOSE SEARCH WHEN CLICKING OUTSIDE
   * ---------------------------------------------------------
   */

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(event.target)
      ) {
        setShowSearchResults(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * PROFILE
   * ---------------------------------------------------------
   */

  function toggleProfile() {
    setProfileOpen((previous) => !previous);
  }

  function closeProfile() {
    setProfileOpen(false);
  }

  function goToSettings() {
    closeProfile();
    navigate("/settings");
  }

  function goToProfile() {
    closeProfile();
    navigate("/profile");
  }

  /*
   * ---------------------------------------------------------
   * LOGOUT
   * ---------------------------------------------------------
   */

  async function handleLogout() {
    try {
      /*
       * If your backend has a logout endpoint,
       * it will be called here.
       */
      await api.post("/auth/logout/");
    } catch (error) {
      /*
       * Logout should still work even if the backend
       * doesn't provide this endpoint.
       */
      console.warn(
        "Logout endpoint unavailable:",
        error
      );
    } finally {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      sessionStorage.clear();

      navigate("/login", {
        replace: true,
      });
    }
  }

  /*
   * ---------------------------------------------------------
   * FORMAT SEARCH RESULT
   * ---------------------------------------------------------
   */

  function formatAmount(value) {
    return `₹${Number(value || 0).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  }

  function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  return (
    <header className="topbar">

      {/* =====================================================
          TITLE
      ===================================================== */}

      <div className="topbar-title">
        <span>Ledgerly</span>

        <b>/</b>

        <strong>
          {getPageTitle()}
        </strong>
      </div>

      {/* =====================================================
          SEARCH
      ===================================================== */}

      <div
        className="topbar-search-wrapper"
        ref={searchWrapperRef}
      >
        <form
          className={`topbar-search ${
            showSearchResults
              ? "search-open"
              : ""
          }`}
          onSubmit={handleSearchSubmit}
        >
          <Search />

          <input
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={handleSearchChange}
            onFocus={() => {
              if (search.trim()) {
                setShowSearchResults(true);
              }
            }}
            placeholder="Search transactions, accounts..."
            aria-label="Search transactions and accounts"
            autoComplete="off"
          />

          {search && (
            <button
              type="button"
              className="search-clear"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <X />
            </button>
          )}

          {!search && (
            <kbd>
              <Command />
              <span>K</span>
            </kbd>
          )}
        </form>

        {/* ===================================================
            SEARCH RESULTS
        =================================================== */}

        {showSearchResults && (
          <div className="search-results">

            {searchLoading ? (
              <div className="search-status">
                <span className="search-spinner" />
                <span>
                  Searching transactions...
                </span>
              </div>
            ) : searchResults.length > 0 ? (
              <>
                <div className="search-results-header">
                  <span>
                    Matching transactions
                  </span>

                  <small>
                    {searchResults.length}
                    {searchResults.length === 8
                      ? "+"
                      : ""}
                  </small>
                </div>

                <div className="search-results-list">
                  {searchResults.map(
                    (transaction) => {
                      const isIncome =
                        transaction.transaction_type ===
                        "income";

                      return (
                        <button
                          type="button"
                          className="search-result"
                          key={transaction.id}
                          onClick={() =>
                            handleSearchResultClick(
                              transaction
                            )
                          }
                        >
                          <span className="search-result-icon">
                            <ReceiptIcon />
                          </span>

                          <span className="search-result-content">
                            <strong>
                              {transaction.description ||
                                transaction.title ||
                                "Transaction"}
                            </strong>

                            <small>
                              {transaction.category_name ||
                                transaction.category ||
                                transaction.transaction_type ||
                                "Transaction"}

                              {transaction.date &&
                                ` • ${formatDate(
                                  transaction.date
                                )}`}
                            </small>
                          </span>

                          <span
                            className={`search-result-amount ${
                              isIncome
                                ? "income"
                                : "expense"
                            }`}
                          >
                            {isIncome ? "+" : "-"}
                            {formatAmount(
                              Math.abs(
                                Number(
                                  transaction.amount ||
                                    0
                                )
                              )
                            )}
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>

                <button
                  type="button"
                  className="search-view-all"
                  onClick={handleSearchSubmit}
                >
                  View all results
                  <span>Enter ↵</span>
                </button>
              </>
            ) : (
              <div className="search-no-results">
                <Search />

                <strong>
                  No results found
                </strong>

                <span>
                  No transactions match "
                  {search.trim()}"
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =====================================================
          ACTIONS
      ===================================================== */}

      <div className="topbar-actions">

        {/* QUICK ADD */}

        <button
          type="button"
          className="quick-add"
          onClick={() =>
            navigate("/transactions")
          }
        >
          <Plus />

          <span>
            Quick Add
          </span>
        </button>

        {/* NOTIFICATION */}

        <button
          type="button"
          className="top-icon"
          aria-label="Notifications"
          onClick={() =>
            navigate("/notifications")
          }
        >
          <Bell />

          <i />
        </button>

        {/* PROFILE */}

        <div className="profile-wrapper">

          <button
            type="button"
            className={`profile ${
              profileOpen
                ? "profile-open"
                : ""
            }`}
            onClick={toggleProfile}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <span className="profile-avatar">
              {initials}
            </span>

            <span className="profile-copy">
              <strong>
                {username}
              </strong>

              <small>
                {email || "Personal account"}
              </small>
            </span>

            <ChevronDown
              className={
                profileOpen
                  ? "rotate"
                  : ""
              }
            />
          </button>

          {/* PROFILE DROPDOWN */}

          {profileOpen && (
            <div
              className="profile-dropdown"
              role="menu"
            >
              <div className="profile-dropdown-header">

                <div className="dropdown-avatar">
                  {initials}
                </div>

                <div>
                  <strong>
                    {username}
                  </strong>

                  <span>
                    {email ||
                      "Personal account"}
                  </span>
                </div>
              </div>

              <div className="dropdown-divider" />

              <button
                type="button"
                className="dropdown-item"
                onClick={goToProfile}
              >
                <User />

                <span>
                  Profile
                </span>
              </button>

              <button
                type="button"
                className="dropdown-item"
                onClick={goToSettings}
              >
                <Settings />

                <span>
                  Settings
                </span>
              </button>

              <div className="dropdown-divider" />

              <button
                type="button"
                className="dropdown-item logout-item"
                onClick={handleLogout}
              >
                <LogOut />

                <span>
                  Sign out
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/*
 * Small icon component used for search results.
 * Kept separate so the main imports stay clean.
 */
function ReceiptIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
      <path d="M8 8h8" />
      <path d="M8 12h8" />
      <path d="M8 16h5" />
    </svg>
  );
}