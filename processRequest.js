const request = require('request')
const qs = require('querystring')
const fs = require('fs')
const url = require('url')

class DoRequest{
    constructor($url, $method, $headers, $params, $files){
        this.url = url.parse($url)
        this.method = $method
        this.headers = $headers
        this.params = $params
        this.files = $files
    }
    request(callback){
        switch(this.method)
        {
            case 'get':
                this.get(callback)
            break;
            case 'post':
                this.post(callback)
            break;
        }
    }
    get(callback){
        request.get(this.url.href, {qs:this.params, headers:this.headers}, (error, response, body)=>{
            let $response = new DoResponse(response, response.headers, body, error)
            callback($response)
        })
    }
    post(callback){
        
        for(let fi in this.files){
            this.params[fi] = fs.createReadStream(this.files[fi].path)
        }

        request.post(this.url.href, {headers:this.headers, formData: this.params}, (error, response, body)=>{
            let $response = new DoResponse(response, response.headers, body, error)
            callback($response)
        })
    }
}

class DoResponse {
    constructor($response, $headers,$body, $error){
        this.response = $response
        this.headers = $headers
        this.body = $body
        this.error = $error
        this.contentType = this.getContentType()
    }
    
    getContentType(){
        let contentType = this.headers['content-type'].toString().split(';')
        switch(contentType[0])
        {
            case 'text/html':
                return 'html'
            case 'text/plain':
                return 'text'
            case 'application/xml':
            case 'text/xml':
                return 'xml'
            case 'application/json':
                return 'json'
            default :
                return ''
        }
    }
}

module.exports = DoRequest, DoResponse;