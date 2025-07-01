import { getSupabase } from './supabase';
import { toast } from 'react-hot-toast';

// Basic logging functions
const logError = (message: string, error?: any) => {
    console.error(message, error);
    // Voorkom toast op de server
    if (typeof window !== 'undefined') {
        toast.error(message);
    }
};
const logInfo = (message: string) => console.log(message);
const logWarning = (message: string) => console.warn(message);

export type Setting = {
  key: string;
  value: any;
  updated_at?: string;
  is_sensitive?: boolean;
};

// Functie om de Supabase client op te halen
const getClient = () => {
    try {
        return getSupabase();
    } catch (error) {
        logError("Supabase client kon niet worden geladen in settings-service", error);
        return null;
    }
};

/**
 * Haalt alle instellingen op uit de database.
 * @returns Een record object met alle instellingen.
 */
export const getAllSettings = async (): Promise<Record<string, any>> => {
    const supabase = getClient();
    if (!supabase) {
        logWarning("Supabase niet beschikbaar, kan instellingen niet ophalen.");
        return {};
    }

    try {
        const { data, error } = await supabase
            .from('settings')
            .select('setting_key, value, is_sensitive');

        if (error) {
            logError('Fout bij ophalen van instellingen', error);
            return {};
        }

        if (!data) {
            logWarning('Geen instellingen gevonden in de database.');
            return {};
        }

        // Filter gevoelige data aan de client-side
        const settings = data.reduce((acc: Record<string, any>, item: { setting_key: string; value: any; is_sensitive?: boolean }) => {
            // Op de server (SSR/API) worden alle keys meegenomen, op de client alleen niet-gevoelige
            if (typeof window !== 'undefined' && item.is_sensitive) {
                return acc;
            }
            acc[item.setting_key] = item.value;
            return acc;
        }, {} as Record<string, any>);

        return settings;

    } catch (error) {
        logError('Onverwachte fout bij ophalen van instellingen', error);
        return {};
    }
};

/**
 * Haalt een specifieke instelling op.
 * @param key De sleutel van de instelling.
 * @returns De waarde van de instelling of null.
 */
export const getSetting = async (key: string): Promise<any> => {
    const supabase = getClient();
    if (!supabase) {
        logWarning(`Supabase niet beschikbaar, kan instelling "${key}" niet ophalen.`);
        return null;
    }

    try {
        const { data, error } = await supabase
            .from('settings')
            .select('value, is_sensitive')
            .eq('setting_key', key)
            .maybeSingle();

        if (error) {
            console.error(`Fout bij ophalen van instelling '${key}':`, {
                message: error.message,
                details: error.details,
                code: error.code,
                hint: error.hint,
            });
            return null;
        }

        if (data) {
            if (typeof window !== 'undefined' && data.is_sensitive) {
                logWarning(`Gevoelige instelling '${key}' kan niet op de client worden opgevraagd.`);
                return null;
            }
            return data.value;
        }

        console.log(`Instelling '${key}' niet gevonden in de database.`);
        return null;

    } catch (error) {
        logError(`Onverwachte fout bij ophalen van instelling: ${key}`, error);
        return null;
    }
};

/**
 * Slaat een instelling op in de database. Deze functie mag alleen server-side worden aangeroepen.
 * @param key De sleutel van de instelling.
 * @param value De waarde van de instelling.
 * @returns Een object met de opgeslagen data of een error.
 */
export const saveSetting = async (key: string, value: any) => {
    if (typeof window !== 'undefined') {
        logError("saveSetting mag niet vanaf de client worden aangeroepen.");
        return { data: null, error: new Error("Security violation: Cannot save settings from client.") };
    }

    const supabase = getClient();
    if (!supabase) {
        logError(`Supabase niet beschikbaar, kan instelling "${key}" niet opslaan.`);
        return { data: null, error: new Error("Supabase client not available") };
    }

    try {
        // We gebruiken .upsert() om zowel nieuwe als bestaande settings te kunnen opslaan.
        const { data, error } = await supabase
            .from('settings')
            .upsert({ setting_key: key, value }, { onConflict: 'setting_key' })
            .select()
            .single();

        if (error) {
            logError(`Fout bij opslaan van instelling: ${key}`, error);
        } else {
            logInfo(`Instelling '${key}' succesvol opgeslagen.`);
        }

        return { data, error };

    } catch (error) {
        logError(`Onverwachte fout bij opslaan van instelling: ${key}`, error);
        return { data: null, error };
    }
};

// Specifieke getter voor het logo, voor gemakkelijke aanroep vanuit componenten.
export const getLogoUrl = async (): Promise<string | null> => {
  return getSetting('logo_url');
}; 