# LinkedIn DOM Selectors Reference

Last verified: 2025-07 (subject to change — LinkedIn updates frequently)

## Search Results Page
| Element | Selector |
|---------|----------|
| Result container | `li.reusable-search__result-container` or `div[data-chameleon-result-urn]` |
| Name | `span.entity-result__title-text` |
| Headline | `p.entity-result__summary` or `div.entity-result__primary-subtitle` |
| Location | `div.entity-result__secondary-subtitle` |
| Profile link | `a[href*='/in/']` |

## Company Page
| Element | Selector |
|---------|----------|
| Title | `head title` (remove ` \| LinkedIn`) |
| Description | `p[data-test-id='about-us__description']` |
| Size | `a.org-about-company-module__link` |
| Industry | `div.org-top-card-summary-info-list__info-item` |
| HQ | `div.org-location-card` |
| Followers | `span.org-top-card-content__followers-count` |

## Profile Page
| Element | Selector |
|---------|----------|
| Name | `h1.text-heading-xlarge` |
| Headline | `div.text-body-medium.break-words` |
| About | `#about ~ .display-flex .inline-show-more-text` |
| Experience section | `#experience ~ .pvs-list__outer-container` |
| Skills | `#skills ~ .pvs-list__outer-container` |
