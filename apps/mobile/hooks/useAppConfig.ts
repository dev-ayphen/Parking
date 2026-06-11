import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export interface SpaceType {
  type: string;
  docs: string[];
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
  icon: string;
}

export interface SupportCategory {
  label: string;
  value: string;
  color: string;
}

export interface SupportPriority {
  label: string;
  value: string;
}

export interface RiskLevel {
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  label: string;
  color: string;
  bg: string;
  border: string;
  note: string;
}

export interface AppConfig {
  spaceTypes: SpaceType[];
  supportCategories: SupportCategory[];
  supportPriorities: SupportPriority[];
  riskLevels: Record<'LOW' | 'MEDIUM' | 'HIGH', RiskLevel>;
  spaceTypeRiskMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'>;
}

/**
 * Hook to fetch and cache app configuration from the backend API.
 * This includes space types, support categories, and other dynamic config.
 * Falls back to empty arrays if API fails.
 */
export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig>({
    spaceTypes: [],
    supportCategories: [],
    supportPriorities: [],
    riskLevels: {} as Record<'LOW' | 'MEDIUM' | 'HIGH', RiskLevel>,
    spaceTypeRiskMap: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [spaceTypesRes, supportRes, riskRes] = await Promise.all([
        api.get('/config/space-types'),
        api.get('/config/support-config'),
        api.get('/config/space-risk-levels'),
      ]);

      setConfig({
        spaceTypes: spaceTypesRes?.spaceTypes || [],
        supportCategories: supportRes?.categories || [],
        supportPriorities: supportRes?.priorities || [],
        riskLevels: riskRes?.riskLevels || {},
        spaceTypeRiskMap: riskRes?.spaceTypeRiskMap || {},
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config');
      // Keep previous config if fetch fails
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return { ...config, loading, error, refetch: fetchConfig };
}
