---
name: devops-engineer
description: DevOps engineering skill for infrastructure management, CI/CD troubleshooting, Docker, Kubernetes, and Terraform. Use when the user says "deploy", "k8s", "kubernetes", "docker compose", "terraform", "helm", "CI/CD", "pipeline", "infrastructure", "rollback", "scale", "cluster", "ingress", "service mesh", "monitoring", "logging", "alerting". Builds on existing kubectl + helm + docker + gh + terraform CLIs.
---

# DevOps Engineer

## Tools Available

| Tool | Purpose |
|------|---------|
| `kubectl` | Cluster management (snap) |
| `helm` | Kubernetes package manager (snap) |
| `docker` | Container runtime |
| `gh` | GitHub CLI (repos, PRs, Actions, issues) |
| `terraform` | Infrastructure as Code |
| MCP `github` | GitHub API (repos, issues, PRs, CI runs) |

## Core Workflows

### 1. CI/CD Pipeline Debugging

When a GitHub Actions workflow fails:

```bash
gh run list --workflow=ci.yml --limit 5
gh run view <id> --log-failed
```

Look for: dependency failures, test failures, timeout, OOM, rate limits.

Common fixes:
- **Dependency cache**: `gh cache list` / `gh cache delete`
- **Rate limiting**: Check `X-RateLimit-Remaining` in logs
- **Flaky tests**: `gh run view <id> --json jobs | jq '.jobs[] | select(.conclusion=="failure")'`

### 2. Docker Operations

Build & debug:
```bash
docker build -t <tag> . 2>&1 | tail -20
docker history <image> --no-trunc
docker run --rm -it --entrypoint /bin/sh <image>
docker system prune -af  # clean build cache
```

Compose:
```bash
docker compose config  # validate
docker compose up -d --build
docker compose logs -f --tail=100
docker compose ps --format json
```

Inspect resource usage:
```bash
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
```

### 3. Kubernetes Management

Quick diagnostics:
```bash
kubectl get events --sort-by='.lastTimestamp' -A | tail -30
kubectl top nodes
kubectl top pods -A --sort-by=memory
kubectl get pods -A | grep -v Running | grep -v Completed
kubectl describe pod <pod> -n <ns>
kubectl logs <pod> -n <ns> --tail=100 -f
```

Common patterns:
```bash
# Rollout
kubectl rollout status deployment/<name> -n <ns>
kubectl rollout undo deployment/<name> -n <ns>

# Port-forward for debugging
kubectl port-forward svc/<name> 8080:80 -n <ns>

# Debug shell
kubectl debug -it --image=busybox <pod> -n <ns>

# Context switching
kubectl config get-contexts
kubectl config use-context <context>
```

Helm:
```bash
helm list -A -a
helm status <release> -n <ns>
helm rollback <release> <rev> -n <ns>
helm get values <release> -n <ns>
helm diff upgrade <release> <chart> -f <values>  # needs helm-diff plugin
```

### 4. Terraform

Workflow:
```bash
terraform init -backend-config=conf/<env>.tfbackend
terraform validate
terraform plan -out=tfplan
terraform show -no-color tfplan
terraform apply tfplan
```

State management:
```bash
terraform state list
terraform state show <resource>
terraform import <resource> <id>
terraform state rm <resource>  # for orphaned resources
```

### 5. Production Debugging Playbook

When alerts fire or things break:

1. **Identify blast radius**: `kubectl get pods -A | grep -v Running`
2. **Check recent changes**: `gh run list --status=completed --limit 10`
3. **Gather telemetry**: `kubectl top pods`, `kubectl logs --since=10m`
4. **Rollback if needed**: `kubectl rollout undo` or `helm rollback`
5. **Postmortem format**: Timeline → Root cause → Impact → Fix → Prevention

## Best Practices

- Always `terraform plan` before apply in remote sessions
- Never `docker push` without explicit auth check
- Container base images: prefer `distroless` or `alpine` in production
- Readiness/Liveness probes are mandatory on every service
- Resource limits must be set in every deployment
- Use `kubectl drain` before node removal (never `delete node` directly)
