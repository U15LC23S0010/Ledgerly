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

  /* =========================================================
     SEARCH STATE
  ========================================================= */

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] =
    useState(false);

  /* =========================================================
     PROFILE STATE
  ========================================================= */

  const [profileOpen, setProfileOpen] = useState(false);

  /* =========================================================
     USER STATE
  ========================================================= */

  const [user, setUser] = useState(() => {
    try {
      const storedUser =
        localStorage.getItem("user");

      if (storedUser) {
        return JSON.parse(storedUser);
      }
    } catch (error) {
      console.error(
        "Unable to read stored user:",
        error
      );
    }

    return null;
  });

  /* =========================================================
     PAGE TITLE
  ========================================================= */

  function getPageTitle() {
    const pathname = location.pathname;

    if (
      pathname === "/" ||
      pathname === "/dashboard"
    ) {
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
      return "Settings";
    }

    if (pathname.startsWith("/guide")) {
      return "User Guide";
    }

    return "Dashboard";
  }

  /* =========================================================
     USER INFORMATION
  ========================================================= */

  const username =
    user?.name ||
    user?.username ||
    user?.full_name ||
    user?.first_name ||
    user?.email?.split("@")[0] ||
    "User";

  const email =
    user?.email || "";

  const initials =
    (
      user?.first_name &&
      user?.last_name
        ? `${user.first_name} ${user.last_name}`
        : username
    )
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) =>
        part.charAt(0).toUpperCase()
      )
      .join("") || "U";

  /* =========================================================
     LOAD CURRENT USER
  ========================================================= */

  useEffect(() => {
    async function loadUser() {
      try {
        const response =
          await api.get("/auth/me");

        const currentUser =
          response.data?.user ||
          response.data;

        if (currentUser) {
          setUser(currentUser);

          localStorage.setItem(
            "user",
            JSON.stringify(currentUser)
          );
        }
      } catch (error) {
        console.warn(
          "Unable to load current user:",
          error
        );
      }
    }

    /*
     * Always try to refresh the user information
     * when Topbar loads.
     *
     * This makes newly registered information
     * available in Settings.
     */
    loadUser();
  }, []);

  /* =========================================================
     SEARCH KEYBOARD SHORTCUT
     ========================================================= */

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
        setProfileOpen(false);

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

  /* =========================================================
     SEARCH TRANSACTIONS
  ========================================================= */

  useEffect(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;

    async function performSearch() {
      try {
        setSearchLoading(true);

        const response =
          await api.get("/transactions/");

        if (cancelled) {
          return;
        }

        const transactions =
          Array.isArray(response.data)
            ? response.data
            : response.data?.results || [];

        const filtered =
          transactions
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

              return searchableText.includes(
                query
              );
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

  /* =========================================================
     SEARCH SUBMIT
  ========================================================= */

  function handleSearchSubmit(event) {
    event.preventDefault();

    const query =
      search.trim();

    if (!query) {
      navigate("/transactions");
      setShowSearchResults(false);
      return;
    }

    setShowSearchResults(false);

    navigate(
      `/transactions?search=${encodeURIComponent(
        query
      )}`
    );
  }

  /* =========================================================
     SEARCH CHANGE
  ========================================================= */

  function handleSearchChange(event) {
    const value =
      event.target.value;

    setSearch(value);

    setShowSearchResults(
      Boolean(value.trim())
    );
  }

  /* =========================================================
     CLEAR SEARCH
  ========================================================= */

  function clearSearch() {
    setSearch("");
    setSearchResults([]);
    setShowSearchResults(false);

    searchInputRef.current?.focus();
  }

  /* =========================================================
     SEARCH RESULT CLICK
  ========================================================= */

  function handleSearchResultClick(
    transaction
  ) {
    const query =
      transaction.description ||
      transaction.title ||
      transaction.category_name ||
      "";

    setShowSearchResults(false);

    navigate(
      `/transactions?search=${encodeURIComponent(
        query
      )}`
    );
  }

  /* =========================================================
     CLOSE SEARCH WHEN CLICKING OUTSIDE
  ========================================================= */

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(
          event.target
        )
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

  /* =========================================================
     PROFILE DROPDOWN
  ========================================================= */

  function toggleProfile() {
    setProfileOpen(
      (previous) => !previous
    );
  }

  function closeProfile() {
    setProfileOpen(false);
  }

  /*
   * Profile does NOT have a separate page.
   * Profile opens Settings because Settings now
   * contains the user's complete information.
   */
  function goToProfile() {
    closeProfile();
    navigate("/profile");
  }

  /*
   * Settings also opens the same Settings page.
   */
  function goToSettings() {
    closeProfile();
    navigate("/settings");
  }

  /* =========================================================
     LOGOUT
  ========================================================= */

  async function handleLogout() {
    try {
      await api.post("/auth/logout/");
    } catch (error) {
      console.warn(
        "Logout endpoint unavailable:",
        error
      );
    } finally {
      /*
       * Remove all authentication information.
       */

      localStorage.removeItem("access");
      localStorage.removeItem(
        "access_token"
      );

      localStorage.removeItem("refresh");
      localStorage.removeItem(
        "refresh_token"
      );

      localStorage.removeItem("token");

      localStorage.removeItem("user");
      localStorage.removeItem("userEmail");

      sessionStorage.clear();

      setUser(null);
      setProfileOpen(false);

      navigate("/login", {
        replace: true,
      });
    }
  }

  /* =========================================================
     FORMAT AMOUNT
  ========================================================= */

  function formatAmount(value) {
    return `₹${Number(
      value || 0
    ).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  function formatDate(value) {
    if (!value) {
      return "";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
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

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <header className="topbar">

      {/* =====================================================
          TITLE
      ===================================================== */}

      <div className="topbar-title">

        <span>
          Ledgerly
        </span>

        <b>
          /
        </b>

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
          onSubmit={
            handleSearchSubmit
          }
        >

          <Search />

          <input
            ref={searchInputRef}
            type="search"
            value={search}
            onChange={
              handleSearchChange
            }
            onFocus={() => {
              if (search.trim()) {
                setShowSearchResults(
                  true
                );
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
              onClick={
                clearSearch
              }
              aria-label="Clear search"
            >
              <X />
            </button>
          )}

          {!search && (
            <kbd>
              <Command />
              <span>
                K
              </span>
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
                    {searchResults.length ===
                      8
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
                          key={
                            transaction.id
                          }
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
                            {isIncome
                              ? "+"
                              : "-"}

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
                  onClick={
                    handleSearchSubmit
                  }
                >
                  View all results

                  <span>
                    Enter ↵
                  </span>

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
                  {search.trim()}
                  "
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

        {/* ===================================================
            QUICK ADD
        =================================================== */}

        <button
          type="button"
          className="quick-add"
          onClick={() =>
            navigate(
              "/transactions"
            )
          }
        >

          <Plus />

          <span>
            Quick Add
          </span>

        </button>

        {/* ===================================================
            NOTIFICATIONS
        =================================================== */}

        <button
          type="button"
          className="top-icon"
          aria-label="Notifications"
          onClick={() =>
            navigate(
              "/notifications"
            )
          }
        >

          <Bell />

          <i />

        </button>

        {/* ===================================================
            PROFILE
        =================================================== */}

        <div className="profile-wrapper">

          <button
            type="button"
            className={`profile ${
              profileOpen
                ? "profile-open"
                : ""
            }`}
            onClick={
              toggleProfile
            }
            aria-expanded={
              profileOpen
            }
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
                {email ||
                  "Personal account"}
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

          {/* =================================================
              PROFILE DROPDOWN
          ================================================= */}

          {profileOpen && (
            <div
              className="profile-dropdown"
              role="menu"
            >

              {/* PROFILE HEADER */}

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

              {/* PROFILE */}

              <button
                type="button"
                className="dropdown-item"
                onClick={
                  goToProfile
                }
              >

                <User size={18} />

                <span>
                  Profile
                </span>

              </button>

              {/* SETTINGS */}

              <button
                type="button"
                className="dropdown-item"
                onClick={
                  goToSettings
                }
              >

                <Settings size={18} />

                <span>
                  Settings
                </span>

              </button>

              <div className="dropdown-divider" />

              {/* LOGOUT */}

              <button
                type="button"
                className="dropdown-item logout-item"
                onClick={
                  handleLogout
                }
              >

                <LogOut size={18} />

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

/* =========================================================
   SEARCH RESULT ICON
========================================================= */

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