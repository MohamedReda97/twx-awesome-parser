# Routes and views

The Node HTTP server serves one viewer at `/`. Navigation is client-side state, not URL routing.

| View | Renderer | Layout |
| --- | --- | --- |
| Summary | `viewSummary()` | Product shell |
| By Type | `viewByType()` | Product shell |
| Toolkits | `viewToolkits()` | Product shell |
| Search | `viewSearch()` | Product shell |
| Dependencies | `viewDependencies()` | Product shell |
| Analyzer | `viewAnalyzer()` | Product shell |
| Settings | `viewSettings()` | Product shell |

The requested presentation is a new standalone server route and does not yet have a rendered target.
