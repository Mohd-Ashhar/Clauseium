export { CONTRACT_TYPES, type ContractType, type Playbook, type ExpectedClause } from "./types";
export { PLAYBOOKS, playbookFor } from "./definitions";
export { detectContractType, type DetectedType } from "./detect";
export {
  checkPlaybook,
  type PlaybookCheckResult,
  type MissingClauseFinding,
} from "./check";
