import { modules as fallbackModules } from "../../../../Shared/src/domain.mjs";
import { useEffect, useState } from "react";
import { env } from "../config/env.js";

export async function getModules() {
  try {
    const response = await fetch(`${env.apiBaseUrl}/api/v1/modules`);

    if (!response.ok) {
      throw new Error(`API respondio ${response.status}`);
    }

    const payload = await response.json();
    return {
      data: payload.data,
      source: "api"
    };
  } catch {
    return {
      data: fallbackModules,
      source: "static"
    };
  }
}

export function useCatalogModules() {
  const [state, setState] = useState({
    modules: fallbackModules,
    source: "static"
  });

  useEffect(() => {
    let isMounted = true;

    getModules().then((result) => {
      if (isMounted) {
        setState({
          modules: result.data,
          source: result.source
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
