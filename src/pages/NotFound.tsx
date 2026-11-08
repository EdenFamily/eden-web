import { useEffect } from "react";
import { I } from "../components/icons";
import { Link } from "../components/router";
import { StateCard } from "../components/ui";

/** Any path Eden doesn't know. It used to fall through to Explore, which hid broken links. */
export function NotFound() {
  useEffect(() => { document.title = "Page not found · Eden"; return () => { document.title = "Eden · Every token starts in Eden"; }; }, []);
  return (
    <div className="wrap">
      <StateCard as="h1" code="404" title="This page isn't in Eden"
        body="The link may be old or mistyped. Tokens live at /token/ followed by their contract address; search finds them by name or ticker.">
        <Link className="btn btn-primary" to="/">Go to Explore</Link>
        <Link className="btn btn-quiet" to="/create">{I.plus()}Launch a token</Link>
        <Link className="btn btn-quiet" to="/docs">Read the docs</Link>
      </StateCard>
    </div>
  );
}
