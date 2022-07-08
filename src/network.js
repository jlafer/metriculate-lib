import {curry, isEmpty} from 'ramda';
import axios from 'axios';

export function setBaseUrl(baseURL) {
  return {
    baseURL,
    headers: {
      'Content-Type': 'application/json'
    }
  };
}

export const addTokenAsData = curry((Token, config) => {
  const data = {...config.data, Token};
  return {...config, data};
});

export const addBasicCredentials = curry((username, password, config) => {
  return {...config,
    auth: {username, password}
  };
});

export const addHeader = curry((key, value, config) => {
  const headers = {...config.headers, [key]: value};
  return {...config, headers};
});

export const addAuthorization = curry((authType, authStr, config) => {
  return addHeader('Authorization', `${authType} ${authStr}`, config);
});

export const addBearerToken = curry((token, config) => {
  return addAuthorization('Bearer', token, config);
});

const encodings = {
  json: 'application/json',
  form: 'application/x-www-form-urlencoded'
};

export const setEncoding = curry((encoding, config) => {
  const contentType = encodings[encoding];
  return addHeader('Content-Type', contentType, config);
});

export const makeConfig = (baseConfig, url, method, data) => {
  const config = {...baseConfig, url, method};
  const allData = {...config.data, ...data};
  if (isEmpty(allData))
    return config;
  if (config.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
    config.data = new URLSearchParams(allData);
    config.headers['Content-length'] = config.data.length;
  }
  else
    config.data = allData;
  return config;
};

export const getResource = async (apiSpec, maxRetries = 10, increase = 5, retryCount = 0, lastError = null) => {
  console.log('getResource: maxRetries ', maxRetries);
  if (retryCount > maxRetries) throw new Error(lastError);
  try {
    console.log('getResource: try attempt ', retryCount);
    console.log('  at ', new Date());
    const {apiConfig, path, method, data} = apiSpec;
    return await callApi(apiConfig, path, method, data);
  } catch (e) {
    console.log('getResource: caught error', e);
    console.log('  at ', new Date());
    await delay(retryCount, increase);
    return getResource(apiSpec, maxRetries, increase, retryCount + 1, e);
  }
};

const delay = (retryCount, increase) =>
  new Promise(resolve => setTimeout(resolve, (5 + increase * retryCount) * 1000));

export const callApi = (baseConfig, url, method, data) => {
  const config = makeConfig(baseConfig, url, method, data);
  //console.log('calling axios with config:', config);
  return axios(config)
  .then(response => response.data)
  .catch(error => {
    console.log('-----------------callApi: an error occurred:');
    if (error.code) {
      console.log(error.code);
      throw new Error(error.code);
    } else if (error.response) {
      // The request was made and the server responded with a status code
      // that falls outside the range of 2xx
      console.log(error.response.status);
      console.log(error.response.data);
      console.log(error.response.headers);
      throw new Error(error.response);
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      console.log(error.request);
      throw new Error({error: 'no response received', request: error.request});
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('Error', error.message);
      throw new Error({error: error.message});
    }
  })
}
