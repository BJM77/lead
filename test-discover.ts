import { config } from 'dotenv';
config();
import { discoverUrlsAction } from './src/app/actions';

async function test() {
  try {
    console.log("Running discoverUrlsAction...");
    const result = await discoverUrlsAction({
      query: "test query inurl:about",
      limit: 2,
      excludeUrls: []
    });
    console.log("Result:", result);
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
