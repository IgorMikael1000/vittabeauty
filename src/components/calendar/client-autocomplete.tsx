"use client";

import { useEffect, useState } from "react";
import { searchClientsAction } from "@/app/actions/clients";

type ClientOption = {
  id: string;
  name: string;
  whatsapp: string;
};

export function ClientAutocomplete({
  onSelectionChange,
}: {
  onSelectionChange: (selected: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(
    null,
  );
  const [results, setResults] = useState<ClientOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  useEffect(() => {
    const searchTerm = query.trim();
    if (selectedClient || searchTerm.length < 2) {
      return;
    }

    let active = true;
    const timeout = setTimeout(async () => {
      if (active) {
        setIsSearching(true);
        setSearchError("");
      }

      try {
        const clients = await searchClientsAction(searchTerm);
        if (active) {
          setResults(clients);
        }
      } catch (error) {
        console.error("Could not search clients for appointment.", error);
        if (active) {
          setResults([]);
          setSearchError("Não foi possível buscar clientes. Tente novamente.");
        }
      } finally {
        if (active) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query, selectedClient]);

  function updateQuery(value: string) {
    setQuery(value);
    setSelectedClient(null);
    setResults([]);
    setIsSearching(value.trim().length >= 2);
    setSearchError("");
    onSelectionChange(false);
  }

  function selectClient(client: ClientOption) {
    setSelectedClient(client);
    setQuery(`${client.name} · ${client.whatsapp}`);
    setResults([]);
    setIsSearching(false);
    setSearchError("");
    onSelectionChange(true);
  }

  return (
    <div className="relative">
      <label
        className="block text-sm font-medium text-vitta-text"
        htmlFor="appointment-client"
      >
        Cliente
      </label>
      <input
        aria-autocomplete="list"
        aria-controls="appointment-client-results"
        aria-expanded={!selectedClient && query.trim().length >= 2}
        autoComplete="off"
        className="mt-1.5 w-full rounded-xl border border-vitta-border bg-white px-3 py-2.5 outline-none focus:border-vitta focus:ring-2 focus:ring-vitta/15"
        id="appointment-client"
        onChange={(event) => updateQuery(event.target.value)}
        placeholder="Buscar por nome ou início do WhatsApp"
        required
        role="combobox"
        value={query}
      />
      <input
        name="clientId"
        type="hidden"
        value={selectedClient?.id ?? ""}
      />
      {selectedClient && (
        <button
          className="mt-1 text-xs font-medium text-vitta hover:underline"
          onClick={() => updateQuery("")}
          type="button"
        >
          Trocar cliente
        </button>
      )}
      {!selectedClient && query.trim().length >= 2 && (
        <div
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-vitta-border bg-white p-1 shadow-lg"
          id="appointment-client-results"
          role="listbox"
        >
          {isSearching ? (
            <p className="px-3 py-2 text-sm text-vitta-muted">
              Buscando clientes...
            </p>
          ) : searchError ? (
            <p className="px-3 py-2 text-sm text-red-700">{searchError}</p>
          ) : results.length > 0 ? (
            results.map((client) => (
              <button
                className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-vitta-background"
                key={client.id}
                onClick={() => selectClient(client)}
                aria-selected={false}
                role="option"
                type="button"
              >
                <span className="block font-medium text-vitta-text">
                  {client.name}
                </span>
                <span className="block text-xs text-vitta-muted">
                  {client.whatsapp}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-vitta-muted">
              Nenhum cliente encontrado.
            </p>
          )}
        </div>
      )}
      {!selectedClient && query.trim().length < 2 && (
        <p className="mt-1 text-xs text-vitta-muted">
          Digite 2 caracteres do nome ou 3 dígitos iniciais do WhatsApp.
        </p>
      )}
    </div>
  );
}
