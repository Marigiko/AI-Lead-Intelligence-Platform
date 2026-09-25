"""
Phone parser — normalizes and validates phone numbers.
Uses Google's phonenumbers library for international support.
"""

import re
from dataclasses import dataclass

import phonenumbers
import structlog

logger = structlog.get_logger()

# Argentine phone regex patterns (common formats found in scraping)
AR_PHONE_REGEX = re.compile(r"(?:\+?54[\s.-]?)?(?:\d{2,4}[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}")

# Generic international phone regex
GENERIC_PHONE_REGEX = re.compile(
    r"(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{1,4}\)?[\s.-]?)?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,9}"
)


@dataclass
class PhoneResult:
    number: str  # E164 format
    formatted: str  # National display format
    country_code: str
    is_valid: bool
    number_type: str  # mobile, fixed_line, etc.


class PhoneParser:
    """Parse and normalize phone numbers from raw text."""

    def __init__(self, default_region: str = "AR") -> None:
        self._default_region = default_region

    def _clean_raw(self, raw: str) -> str:
        """Remove non-printable and weird unicode characters from phone."""
        cleaned = "".join(c for c in raw if c.isprintable() and ord(c) < 0xE000)
        return cleaned.strip()

    def parse(self, raw_number: str, region: str | None = None) -> PhoneResult | None:
        """Parse a raw phone number string into a normalized result."""
        if not raw_number or len(raw_number.strip()) < 7:
            return None

        region = region or self._default_region
        raw_number = self._clean_raw(raw_number)

        try:
            parsed = phonenumbers.parse(raw_number, region)
            if not phonenumbers.is_valid_number(parsed):
                return None

            number_type = phonenumbers.number_type(parsed)
            type_str = self._type_to_str(number_type)

            return PhoneResult(
                number=phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164),
                formatted=phonenumbers.format_number(
                    parsed, phonenumbers.PhoneNumberFormat.NATIONAL
                ),
                country_code=f"+{parsed.country_code}",
                is_valid=True,
                number_type=type_str,
            )
        except phonenumbers.NumberParseException:
            return None

    def extract_from_text(self, text: str, region: str | None = None) -> list[PhoneResult]:
        """Extract phone numbers from arbitrary text."""
        results: list[PhoneResult] = []
        seen: set[str] = set()

        region = region or self._default_region
        text = self._clean_raw(text)

        # Use phonenumbers built-in matcher
        for match in phonenumbers.PhoneNumberMatcher(text, region):
            number_str = phonenumbers.format_number(
                match.number, phonenumbers.PhoneNumberFormat.E164
            )
            if number_str not in seen:
                seen.add(number_str)
                results.append(
                    PhoneResult(
                        number=number_str,
                        formatted=phonenumbers.format_number(
                            match.number, phonenumbers.PhoneNumberFormat.NATIONAL
                        ),
                        country_code=f"+{match.number.country_code}",
                        is_valid=phonenumbers.is_valid_number(match.number),
                        number_type=self._type_to_str(phonenumbers.number_type(match.number)),
                    )
                )

        return results

    @staticmethod
    def _type_to_str(number_type: int) -> str:
        """Convert phonenumbers type enum to string."""
        type_map = {
            0: "fixed_line",
            1: "mobile",
            2: "fixed_line_or_mobile",
            3: "toll_free",
            4: "premium_rate",
            5: "shared_cost",
            6: "voip",
            7: "personal_number",
            8: "pager",
            9: "uan",
            10: "voicemail",
            99: "unknown",
        }
        return type_map.get(number_type, "unknown")


async def get_phone_parser(default_region: str = "AR") -> PhoneParser:
    """Factory function for PhoneParser."""
    return PhoneParser(default_region=default_region)
