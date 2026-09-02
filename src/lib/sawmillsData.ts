/**
 * Directory and storage helpers for Sawmills (Serrarias) and Yards (Pátios de Descarregamento)
 */

export const DEFAULT_SERRARIAS: string[] = [
  "Serraria Principal (Matriz)",
  "Serraria 02 (Filial)",
  "Serraria Terceirizada",
  "Serraria Nova Esperança"
];

export const DEFAULT_PATIOS: string[] = [
  "Pátio 01 (Principal)",
  "Pátio 02 (Secundário)",
  "Pátio 03 (Estocagem)",
  "Pátio Central"
];

export function getRegisteredSerrarias(): string[] {
  try {
    const stored = localStorage.getItem("manejo_serrarias_directory");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Error reading serrarias directory:", e);
  }
  return DEFAULT_SERRARIAS;
}

export function saveRegisteredSerrarias(list: string[]): void {
  try {
    const cleanList = Array.from(new Set(list.map(s => s.trim()).filter(Boolean)));
    localStorage.setItem("manejo_serrarias_directory", JSON.stringify(cleanList));
  } catch (e) {
    console.error("Error saving serrarias directory:", e);
  }
}

export function getRegisteredPatios(): string[] {
  try {
    const stored = localStorage.getItem("manejo_patios_directory");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("Error reading patios directory:", e);
  }
  return DEFAULT_PATIOS;
}

export function saveRegisteredPatios(list: string[]): void {
  try {
    const cleanList = Array.from(new Set(list.map(p => p.trim()).filter(Boolean)));
    localStorage.setItem("manejo_patios_directory", JSON.stringify(cleanList));
  } catch (e) {
    console.error("Error saving patios directory:", e);
  }
}
