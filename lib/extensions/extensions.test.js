/* eslint-env jest */
/* global spyOn */
// NPM dependencies
const path = require('path')
const fs = require('fs')
const appConfig = require('../../app/config')

// Local dependencies
const extensions = require('./extensions.js')

// Local variables
const rootPath = path.join(__dirname, '..', '..')
let testScope

// helpers
const joinPaths = arr => arr.map(x => path.join.apply(null, [rootPath].concat(x)))

describe('extensions', () => {
  beforeEach(() => {
    testScope = {
      originalValues: {
        appConfigBaseExtensions: appConfig.baseExtensions
      },
      fileSystem: {
        '/package.json': fs.readFileSync('package.json', 'utf8'),
        '/node_modules/govuk-frontend/govuk-prototype-kit.config.json': '{"nunjucksPaths": ["/","/components"],"scripts": ["/all.js"],"assets": ["/assets"],"sass": ["/all.scss"]}'
      }
    }
    setupFakeFilesystem()
    extensions.setExtensionsByType()
  })
  afterEach(() => {
    jest.clearAllMocks()
    appConfig.baseExtensions = testScope.originalValues.appConfigBaseExtensions
  })

  describe('Lookup file system paths', () => {
    it('should lookup asset paths as file system paths', () => {
      expect(extensions.getFileSystemPaths('assets')).toEqual(joinPaths([
        ['node_modules', 'govuk-frontend', 'assets']
      ]))
    })
    it('should not allow traversing the file system', () => {
      mockExtensionConfig('govuk-frontend', { assets: ['/abc/../../../../../def'] })
      expect(extensions.getFileSystemPaths('assets')).toEqual(joinPaths([
        ['node_modules', 'govuk-frontend', 'abc', 'def']
      ]))
    })
    it('should show installed extensions asset paths as file system paths', () => {
      delete appConfig.baseExtensions
      mockExtensionConfig('another-frontend', {
        assets: ['/abc', '/def']
      })
      mockExtensionConfig('hmrc-frontend', {
        assets: ['/ghi', '/jkl']
      })
      expect(extensions.getFileSystemPaths('assets')).toEqual(joinPaths([
        ['node_modules', 'govuk-frontend', 'assets'],
        ['node_modules', 'another-frontend', 'abc'],
        ['node_modules', 'another-frontend', 'def'],
        ['node_modules', 'hmrc-frontend', 'ghi'],
        ['node_modules', 'hmrc-frontend', 'jkl']
      ]))
    })
    it('should follow strict alphabetical order when no base extensions used', () => {
      appConfig.baseExtensions = []
      mockExtensionConfig('another-frontend', {
        assets: ['/abc', '/def']
      })
      mockExtensionConfig('hmrc-frontend', {
        assets: ['/ghi', '/jkl']
      })
      expect(extensions.getFileSystemPaths('assets')).toEqual(joinPaths([
        ['node_modules', 'another-frontend', 'abc'],
        ['node_modules', 'another-frontend', 'def'],
        ['node_modules', 'govuk-frontend', 'assets'],
        ['node_modules', 'hmrc-frontend', 'ghi'],
        ['node_modules', 'hmrc-frontend', 'jkl']
      ]))
    })
    it('should put specified baseExtensions at the top', () => {
      appConfig.baseExtensions = ['hmrc-frontend', 'govuk-frontend']
      mockExtensionConfig('another-frontend', {
        assets: ['/abc', '/def']
      })
      mockExtensionConfig('hmrc-frontend', {
        assets: ['/ghi', '/jkl']
      })
      expect(extensions.getFileSystemPaths('assets')).toEqual(joinPaths([
        ['node_modules', 'hmrc-frontend', 'ghi'],
        ['node_modules', 'hmrc-frontend', 'jkl'],
        ['node_modules', 'govuk-frontend', 'assets'],
        ['node_modules', 'another-frontend', 'abc'],
        ['node_modules', 'another-frontend', 'def']
      ]))
    })
    it('should show installed extensions asset paths as file system paths', () => {
      mockExtensionConfig('hmrc-frontend', {
        assets: ['/abc', '/def']
      })
      expect(extensions.getFileSystemPaths('assets')).toEqual(joinPaths([
        ['node_modules', 'govuk-frontend', 'assets'],
        ['node_modules', 'hmrc-frontend', 'abc'],
        ['node_modules', 'hmrc-frontend', 'def']
      ]))
    })
    it('should lookup scripts paths as file system paths', () => {
      expect(extensions.getFileSystemPaths('scripts')).toEqual(joinPaths([
        'node_modules/govuk-frontend/all.js'
      ]))
    })
    it('should not break when asking for an extension key which isn\'t used', function () {
      expect(extensions.getFileSystemPaths('thisListDoesNotExist')).toEqual([])
    })
  })

  describe('Lookup public URLs', () => {
    it('should show installed extensions asset paths as file system paths', () => {
      delete appConfig.baseExtensions
      mockExtensionConfig('another-frontend', {
        assets: ['/abc', '/def']
      })
      mockExtensionConfig('hmrc-frontend', {
        assets: ['/ghi', '/jkl']
      })
      expect(extensions.getPublicUrls('assets')).toEqual([
        '/assets',
        '/extension-assets/another-frontend/abc',
        '/extension-assets/another-frontend/def',
        '/extension-assets/hmrc-frontend/ghi',
        '/extension-assets/hmrc-frontend/jkl'
      ])
    })
    it('should follow strict alphabetical order when no base extensions used', () => {
      appConfig.baseExtensions = []
      mockExtensionConfig('another-frontend', {
        assets: ['/abc', '/def']
      })
      mockExtensionConfig('hmrc-frontend', {
        assets: ['/ghi', '/jkl']
      })
      expect(extensions.getPublicUrls('assets')).toEqual([
        '/extension-assets/another-frontend/abc',
        '/extension-assets/another-frontend/def',
        '/assets',
        '/extension-assets/hmrc-frontend/ghi',
        '/extension-assets/hmrc-frontend/jkl'
      ])
    })
    it('should put specified baseExtensions at the top', () => {
      appConfig.baseExtensions = ['hmrc-frontend', 'govuk-frontend']
      mockExtensionConfig('another-frontend', {
        assets: ['/abc', '/def']
      })
      mockExtensionConfig('hmrc-frontend', {
        assets: ['/ghi', '/jkl']
      })
      expect(extensions.getPublicUrls('assets')).toEqual([
        '/extension-assets/hmrc-frontend/ghi',
        '/extension-assets/hmrc-frontend/jkl',
        '/assets',
        '/extension-assets/another-frontend/abc',
        '/extension-assets/another-frontend/def'
      ])
    })
    it('should url encode each part', () => {
      mockExtensionConfig('mine', { assets: ['/abc:def'] })
      mockUninstallExtension('govuk-frontend')

      expect(extensions.getPublicUrls('assets')).toEqual(['/extension-assets/mine/abc%3Adef'])
    })
  })

  describe('Lookup public URLs with file system paths', () => {
    it('should show installed extensions asset paths as file system paths', () => {
      delete appConfig.baseExtensions
      mockExtensionConfig('another-frontend', {
        assets: ['/abc', '/def']
      })
      mockExtensionConfig('hmrc-frontend', {
        assets: ['/ghi', '/jkl']
      })
      expect(extensions.getPublicUrlAndFileSystemPaths('assets')).toEqual([
        {
          publicUrl: '/assets',
          fileSystemPath: path.join(rootPath, 'node_modules', 'govuk-frontend', 'assets')
        },
        {
          publicUrl: '/extension-assets/another-frontend/abc',
          fileSystemPath: path.join(rootPath, 'node_modules', 'another-frontend', 'abc')
        },
        {
          publicUrl: '/extension-assets/another-frontend/def',
          fileSystemPath: path.join(rootPath, 'node_modules', 'another-frontend', 'def')
        },
        {
          publicUrl: '/extension-assets/hmrc-frontend/ghi',
          fileSystemPath: path.join(rootPath, 'node_modules', 'hmrc-frontend', 'ghi')
        },
        {
          publicUrl: '/extension-assets/hmrc-frontend/jkl',
          fileSystemPath: path.join(rootPath, 'node_modules', 'hmrc-frontend', 'jkl')
        }
      ])
    })
    it('should follow strict alphabetical order when no base extensions used', () => {
      appConfig.baseExtensions = []
      mockExtensionConfig('another-frontend', {
        assets: ['/abc', '/def']
      })
      mockExtensionConfig('hmrc-frontend', {
        assets: ['/ghi', '/jkl']
      })
      expect(extensions.getPublicUrlAndFileSystemPaths('assets')).toEqual([
        {
          publicUrl: '/extension-assets/another-frontend/abc',
          fileSystemPath: path.join(rootPath, 'node_modules', 'another-frontend', 'abc')
        },
        {
          publicUrl: '/extension-assets/another-frontend/def',
          fileSystemPath: path.join(rootPath, 'node_modules', 'another-frontend', 'def')
        },
        {
          publicUrl: '/assets',
          fileSystemPath: path.join(rootPath, 'node_modules', 'govuk-frontend', 'assets')
        },
        {
          publicUrl: '/extension-assets/hmrc-frontend/ghi',
          fileSystemPath: path.join(rootPath, 'node_modules', 'hmrc-frontend', 'ghi')
        },
        {
          publicUrl: '/extension-assets/hmrc-frontend/jkl',
          fileSystemPath: path.join(rootPath, 'node_modules', 'hmrc-frontend', 'jkl')
        }
      ])
    })
    it('should put specified baseExtensions at the top', () => {
      appConfig.baseExtensions = ['hmrc-frontend', 'govuk-frontend']
      mockExtensionConfig('another-frontend', {
        assets: ['/abc', '/def']
      })
      mockExtensionConfig('hmrc-frontend', {
        assets: ['/ghi', '/jkl']
      })
      expect(extensions.getPublicUrlAndFileSystemPaths('assets')).toEqual([
        {
          publicUrl: '/extension-assets/hmrc-frontend/ghi',
          fileSystemPath: path.join(rootPath, 'node_modules', 'hmrc-frontend', 'ghi')
        },
        {
          publicUrl: '/extension-assets/hmrc-frontend/jkl',
          fileSystemPath: path.join(rootPath, 'node_modules', 'hmrc-frontend', 'jkl')
        },
        {
          publicUrl: '/assets',
          fileSystemPath: path.join(rootPath, 'node_modules', 'govuk-frontend', 'assets')
        },
        {
          publicUrl: '/extension-assets/another-frontend/abc',
          fileSystemPath: path.join(rootPath, 'node_modules', 'another-frontend', 'abc')
        },
        {
          publicUrl: '/extension-assets/another-frontend/def',
          fileSystemPath: path.join(rootPath, 'node_modules', 'another-frontend', 'def')
        }
      ])
    })
    it('should url encode each part', () => {
      mockExtensionConfig('mine', { assets: ['/abc:def'] })
      mockUninstallExtension('govuk-frontend')

      expect(extensions.getPublicUrls('assets')).toEqual(['/extension-assets/mine/abc%3Adef'])
    })
    it('should not break when asking for an extension key which isn\'t used', function () {
      expect(extensions.getPublicUrls('anotherListThatDoesntExist')).toEqual([])
    })
  })

  describe('getAppViews', () => {
    it('should be a function', () => {
      expect(extensions.getAppViews).toBeInstanceOf(Function)
    })

    it('should output govuk-frontend nunjucks paths as an array', () => {
      expect(extensions.getAppViews()).toEqual(joinPaths([
        'node_modules/govuk-frontend/components',
        'node_modules/govuk-frontend'
      ]))
    })

    it('should also output hmcts-frontend nunjucks paths after it is installed', () => {
      mockExtensionConfig('hmcts-frontend', {
        nunjucksPaths: [
          '/my-components',
          '/my-layouts'
        ]
      })

      expect(extensions.getAppViews()).toEqual(joinPaths([
        'node_modules/hmcts-frontend/my-layouts',
        'node_modules/hmcts-frontend/my-components',
        'node_modules/govuk-frontend/components',
        'node_modules/govuk-frontend'
      ]))
    })

    it('should not output any nunjucks paths when frontends are uninstalled', () => {
      mockUninstallExtension('govuk-frontend')

      expect(extensions.getAppViews()).toEqual([])
    })

    it('should also output provided paths in the array', () => {
      expect(extensions.getAppViews(joinPaths([
        '/app/views',
        '/lib'
      ]))).toEqual(joinPaths([
        'node_modules/govuk-frontend/components',
        'node_modules/govuk-frontend',
        '/app/views',
        '/lib'
      ]))
    })

    it('should output any provided paths in the array', () => {
      expect(extensions.getAppViews([
        '/my-new-views-directory'
      ])).toEqual([
        path.join(rootPath, 'node_modules/govuk-frontend/components'),
        path.join(rootPath, 'node_modules/govuk-frontend'),
        '/my-new-views-directory'
      ])
    })
  })

  describe('getAppConfig', () => {
    it('returns an object', () => {
      expect(extensions.getAppConfig()).toBeInstanceOf(Object)
    })

    it('should have script and stylesheet keys', () => {
      expect(Object.keys(extensions.getAppConfig())).toEqual(['scripts', 'stylesheets'])
    })

    it('should return a list of public urls for the scripts', () => {
      expect(extensions.getAppConfig().scripts).toEqual([
        '/extension-assets/govuk-frontend/all.js'
      ])
    })

    it('should return a list of public urls for the stylesheets', () => {
      expect(extensions.getAppConfig().stylesheets).toEqual([])
    })

    it('should include installed extensions', () => {
      mockExtensionConfig('my-extension', { scripts: ['/abc/def/ghi.js'] })
      expect(extensions.getAppConfig().scripts).toEqual([
        '/extension-assets/govuk-frontend/all.js',
        '/extension-assets/my-extension/abc/def/ghi.js'
      ])
    })

    it('should return a list of public urls for the stylesheets', () => {
      expect(extensions.getAppConfig().stylesheets).toEqual([])
    })

    it('should include installed extensions', () => {
      mockExtensionConfig('my-extension', { stylesheets: ['/abc/def/ghi.css'] })
      expect(extensions.getAppConfig().stylesheets).toEqual([
        '/extension-assets/my-extension/abc/def/ghi.css'
      ])
    })
  })

  describe('error handling', () => {
    it('should cope with keys which aren\'t arrays', () => {
      mockExtensionConfig('my-fixable-extension', { stylesheets: '/abc.css' })
      mockExtensionConfig('another-fixable-extension', { stylesheets: '/abc.css' })

      expect(extensions.getAppConfig().stylesheets).toEqual([
        '/extension-assets/another-fixable-extension/abc.css',
        '/extension-assets/my-fixable-extension/abc.css'
      ])
    })
    it('should throw if paths use backslashes', () => {
      mockExtensionConfig('my-unfixable-extension', { stylesheets: '\\abc\\def.css' })
      mockExtensionConfig('another-fixable-extension', { stylesheets: ['/abc.css'] })

      const expectedError = new Error('Can\'t use backslashes in extension paths - "my-unfixable-extension" used "\\abc\\def.css".')

      expect(() => {
        extensions.getFileSystemPaths('stylesheets')
      }).toThrow(expectedError)

      expect(() => {
        extensions.getPublicUrlAndFileSystemPaths('stylesheets')
      }).toThrow(expectedError)
    })
    it('should throw if paths use backslashes further into the path', () => {
      mockExtensionConfig('my-other-unfixable-extension', { stylesheets: ['/abc\\def.css'] })
      const expectedError2 = new Error('Can\'t use backslashes in extension paths - "my-other-unfixable-extension" used "/abc\\def.css".')

      expect(() => {
        extensions.getFileSystemPaths('stylesheets')
      }).toThrow(expectedError2)

      expect(() => {
        extensions.getPublicUrlAndFileSystemPaths('stylesheets')
      }).toThrow(expectedError2)
    })
    it('should throw if it doesn\'t start with a forward slash', () => {
      mockExtensionConfig('yet-another-unfixable-extension', { stylesheets: ['abc.css'] })

      const noLeadingForwardSlashError = new Error('All extension paths must start with a forward slash - "yet-another-unfixable-extension" used "abc.css".')

      expect(() => {
        extensions.getFileSystemPaths('stylesheets')
      }).toThrow(noLeadingForwardSlashError)

      expect(() => {
        extensions.getPublicUrlAndFileSystemPaths('stylesheets')
      }).toThrow(noLeadingForwardSlashError)
    })
  })

  const setupFakeFilesystem = () => {
    const trimFilePath = filePath => (filePath).replace(rootPath, '')

    spyOn(fs, 'readFileSync').and.callFake(function (filePath) {
      const trimmedPath = trimFilePath(filePath)

      if (testScope.fileSystem[trimmedPath]) {
        return testScope.fileSystem[trimmedPath]
      } else {
        const err = new Error(`ENOENT: no such file or directory, open '${filePath}'`)
        err.code = 'ENOENT'
        throw err
      }
    })
    spyOn(fs, 'existsSync').and.callFake(filePath => testScope.fileSystem.hasOwnProperty(trimFilePath(filePath)))
  }

  const mockInstallExtension = (packageName, version = '^0.0.1') => {
    const existingPackageJson = JSON.parse(testScope.fileSystem['/package.json'])
    existingPackageJson.dependencies[packageName] = version
    testScope.fileSystem['/package.json'] = JSON.stringify(existingPackageJson)
    extensions.setExtensionsByType()
  }

  const mockUninstallExtension = (packageName) => {
    const existingPackageJson = JSON.parse(testScope.fileSystem['/package.json'])
    if (!existingPackageJson.dependencies.hasOwnProperty(packageName)) {
      throw new Error(`Could not uninstall '${packageName}' as it is not installed`)
    }
    delete existingPackageJson.dependencies[packageName]
    testScope.fileSystem['/package.json'] = JSON.stringify(existingPackageJson)
    extensions.setExtensionsByType()
  }

  const mockExtensionConfig = (packageName, config = {}, version) => {
    testScope.fileSystem[`/node_modules/${packageName}/govuk-prototype-kit.config.json`] = JSON.stringify(config, null, 2)
    mockInstallExtension(packageName, version)
  }
})