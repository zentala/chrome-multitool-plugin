/**
 * Interface for module settings configuration
 * Defines the structure for individual module settings
 */
export interface ModuleSettings {
  /** Unique identifier for the module */
  id: string;
  /** Display name of the module */
  name: string;
  /** Icon identifier or URL for the module */
  icon: string;
  /** Whether the module is enabled */
  enabled: boolean;
  /** Module-specific settings as key-value pairs */
  settings: Record<string, unknown>;
}

/**
 * Interface for popup module configuration
 * Defines how modules appear in the popup interface
 */
export interface PopupModule {
  /** Unique identifier for the module */
  id: string;
  /** Display name of the module */
  name: string;
  /** Icon identifier or URL for the module */
  icon: string;
  /** React component for the module */
  component: React.ComponentType;
  /** React component for the module's settings */
  settingsComponent: React.ComponentType;
  /** Whether the module is currently active */
  isActive: boolean;
}
