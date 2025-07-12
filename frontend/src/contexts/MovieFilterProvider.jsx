import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { fetchFilterOptions, fetchMovies } from "@services/movieFilterService";
import NProgress from "nprogress";

// ---------------- Types ----------------

const initialState = {
  filters: {
    region: null,
    genre: null,
    year: null,
    season: null,
    order: "hot", // lowercase for consistency
  },
  movies: [],
  options: {
    countries: [],
    genres: [],
    years: [],
  },
  loadingMovies: false,
  loadingOptions: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_FILTER": {
      return {
        ...state,
        filters: {
          ...state.filters,
          [action.payload.key]: action.payload.value,
        },
      };
    }
    case "SET_OPTIONS":
      return { ...state, options: action.payload };
    case "SET_MOVIES":
      return { ...state, movies: action.payload };
    case "SET_LOADING_MOVIES":
      return { ...state, loadingMovies: action.payload };
    case "SET_LOADING_OPTIONS":
      return { ...state, loadingOptions: action.payload };
    default:
      return state;
  }
}

const MovieFilterContext = createContext(null);

export const MovieFilterProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // --- Fetch filter options once ---
  useEffect(() => {
    let isMounted = true;
    async function loadOptions() {
      dispatch({ type: "SET_LOADING_OPTIONS", payload: true });
      try {
        const data = await fetchFilterOptions();
        if (isMounted) {
          dispatch({ type: "SET_OPTIONS", payload: data });
        }
      } catch (err) {
        console.error("Error fetching filter options", err);
      } finally {
        if (isMounted) dispatch({ type: "SET_LOADING_OPTIONS", payload: false });
      }
    }
    loadOptions();
    return () => {
      isMounted = false;
    };
  }, []);

  // --- Fetch movies whenever filters change ---
  useEffect(() => {
    let isMounted = true;
    async function loadMovies() {
      dispatch({ type: "SET_LOADING_MOVIES", payload: true });
      NProgress.start();
      try {
        const movies = await fetchMovies(state.filters);
        if (isMounted) dispatch({ type: "SET_MOVIES", payload: movies });
      } catch (err) {
        console.error("Error fetching movies", err);
        if (isMounted) dispatch({ type: "SET_MOVIES", payload: [] });
      } finally {
        if (isMounted) dispatch({ type: "SET_LOADING_MOVIES", payload: false });
        NProgress.done();
      }
    }
    loadMovies();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.filters]);

  const contextValue = useMemo(
    () => ({
      ...state,
      updateFilter: (key, value) => dispatch({ type: "SET_FILTER", payload: { key, value } }),
      resetFilters: () => dispatch({ type: "RESET_FILTERS" }),
    }),
    [state]
  );

  return (
    <MovieFilterContext.Provider value={contextValue}>
      {children}
    </MovieFilterContext.Provider>
  );
};

export const useMovieFilter = () => {
  const ctx = useContext(MovieFilterContext);
  if (!ctx) throw new Error("useMovieFilter must be used within MovieFilterProvider");
  return ctx;
}; 