## Code language

All generated code, comments, documentation, README files, variable and function names, commit messages, and any content intended to be placed in repository files MUST be written in English.

## Commit Message Guidelines

Generated commit messages MUST follow the Conventional Commits format: `<type>(<scope>): <description>`

### Types

Use one of the following types:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes only
- **style**: Code style changes (formatting, missing semicolons, etc.) - no logic changes
- **refactor**: Code refactoring without feature or bug changes
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Build process, dependencies, or tooling changes
- **ci**: CI/CD configuration changes

### Scope

- Use lowercase
- Keep it concise (1-2 words)
- Examples: `api`, `ui`, `build`, `deps`, `automation`
- Use `*` if changes affect multiple scopes

### Description

- Start with a lowercase imperative verb (add, fix, update, implement, remove, etc.)
- Be clear and descriptive but concise (50 characters or less)
- Do not end with a period
- Focus on WHAT changed, not WHY (save details for the body)

### Examples

✅ Good:

- `feat(automation): add support for template conditions`
- `fix(connection): handle timeout errors in ChildProcess`
- `docs(readme): add installation instructions`
- `refactor(types): simplify entity interface definitions`
- `chore(deps): update typescript to 5.3`

❌ Avoid:

- `fixed bug` - too vague, missing type and scope
- `FEAT(AUTOMATION): ADD SUPPORT FOR...` - wrong case
- `feat(automation): added support.` - ends with period, uses past tense
- `feat: support for authentication` - missing scope
