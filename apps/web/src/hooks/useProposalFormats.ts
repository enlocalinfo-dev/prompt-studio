import { useCallback, useMemo, useState } from "react";
import { listAllProposalFormats, type ProposalFormatDef } from "../lib/proposalFormats";

export function useProposalFormats(): {
  formats: ProposalFormatDef[];
  refresh: () => void;
} {
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const formats = useMemo(() => {
    void version;
    return listAllProposalFormats();
  }, [version]);
  return { formats, refresh };
}
